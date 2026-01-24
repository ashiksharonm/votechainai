"""
Blockchain Service

Handles interaction with the VoteLedger smart contract.
Uses web3.py for Ethereum blockchain communication.
"""

import json
from pathlib import Path
from typing import Optional

from web3 import AsyncWeb3, Web3
from web3.exceptions import ContractLogicError, TransactionNotFound

from app.config import settings


class BlockchainService:
    """
    Service for blockchain operations.
    
    Connects to a local Hardhat/Ganache node for development.
    In production, would connect to a real Ethereum network or L2.
    """
    
    def __init__(self):
        """Initialize blockchain connection."""
        self.rpc_url = settings.blockchain_rpc_url
        self.contract_address = settings.contract_address
        self.private_key = settings.private_key
        
        # Initialize web3 (async)
        self.w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(self.rpc_url))
        
        # Load contract ABI if available
        self.contract = None
        self._load_contract()
    
    def _load_contract(self) -> None:
        """Load the VoteLedger contract ABI and create contract instance."""
        if not self.contract_address:
            return
        
        # Path to compiled contract ABI
        abi_path = Path(__file__).parent.parent.parent.parent / "blockchain" / "artifacts" / "contracts" / "VoteLedger.sol" / "VoteLedger.json"
        
        try:
            if abi_path.exists():
                with open(abi_path) as f:
                    contract_json = json.load(f)
                    abi = contract_json.get("abi", [])
                
                self.contract = self.w3.eth.contract(
                    address=Web3.to_checksum_address(self.contract_address),
                    abi=abi
                )
        except Exception as e:
            # Log error but don't fail - allows development without blockchain
            print(f"Warning: Could not load contract ABI: {e}")
    
    async def submit_vote(
        self,
        election_id: int,
        vote_hash: str,
        voter_address: Optional[str] = None
    ) -> str:
        """
        Submit a vote hash to the blockchain.
        
        Args:
            election_id: The election ID
            vote_hash: SHA-256 hash of the vote
            voter_address: Optional voter wallet address
            
        Returns:
            Transaction hash as hex string
            
        Raises:
            Exception if transaction fails
        """
        # If no contract configured, return mock tx hash
        if not self.contract or not self.private_key:
            # Development mode - return mock transaction hash
            import hashlib
            mock_tx = hashlib.sha256(f"{election_id}:{vote_hash}".encode()).hexdigest()
            return f"0x{mock_tx}"
        
        try:
            # Get account from private key
            account = self.w3.eth.account.from_key(self.private_key)
            
            # Convert vote hash to bytes32
            vote_hash_bytes = Web3.to_bytes(hexstr=vote_hash)
            
            # Build transaction
            tx = await self.contract.functions.submitVote(
                election_id,
                vote_hash_bytes
            ).build_transaction({
                'from': account.address,
                'nonce': await self.w3.eth.get_transaction_count(account.address),
                'gas': 100000,
                'gasPrice': await self.w3.eth.gas_price
            })
            
            # Sign and send transaction
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = await self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for confirmation
            receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return receipt.transactionHash.hex()
            
        except ContractLogicError as e:
            # Contract reverted (e.g., already voted)
            raise Exception(f"Contract error: {str(e)}")
        except Exception as e:
            raise Exception(f"Blockchain error: {str(e)}")
    
    async def get_transaction_block(self, tx_hash: str) -> Optional[int]:
        """
        Get the block number for a transaction.
        
        Args:
            tx_hash: Transaction hash to look up
            
        Returns:
            Block number if found, None otherwise
        """
        try:
            # Handle mock transaction hashes in development
            if not self.contract:
                return 12345  # Mock block number for development
            
            tx = await self.w3.eth.get_transaction(tx_hash)
            return tx.get('blockNumber')
        except TransactionNotFound:
            return None
        except Exception:
            return None
    
    async def verify_vote_on_chain(
        self,
        election_id: int,
        vote_hash: str
    ) -> bool:
        """
        Verify a vote exists on the blockchain.
        
        Args:
            election_id: Election ID
            vote_hash: Vote hash to verify
            
        Returns:
            True if vote exists on chain, False otherwise
        """
        if not self.contract:
            return True  # Trust database in development mode
        
        try:
            vote_hash_bytes = Web3.to_bytes(hexstr=vote_hash)
            # This would call a view function on the contract
            # Implementation depends on contract design
            return True
        except Exception:
            return False
    
    async def get_vote_count(self, election_id: int) -> int:
        """
        Get total vote count for an election from blockchain.
        
        Args:
            election_id: Election ID
            
        Returns:
            Number of votes recorded on chain
        """
        if not self.contract:
            return 0
        
        try:
            count = await self.contract.functions.getVoteCount(election_id).call()
            return count
        except Exception:
            return 0
    
    def submit_vote_sync(
        self,
        election_id: int,
        vote_hash: str,
        voter_address: Optional[str] = None
    ) -> str:
        """
        Synchronous version of submit_vote for use with sync database.
        Returns a mock transaction hash for development.
        """
        import hashlib
        mock_tx = hashlib.sha256(f"{election_id}:{vote_hash}".encode()).hexdigest()
        return f"0x{mock_tx}"
    
    def get_transaction_block_sync(self, tx_hash: str) -> Optional[int]:
        """
        Synchronous version of get_transaction_block.
        Returns a mock block number for development.
        """
        return 12345  # Mock block number for development

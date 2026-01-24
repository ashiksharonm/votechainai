const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VoteLedger", function () {
    let voteLedger;
    let admin;
    let voter1;
    let voter2;

    const ELECTION_ID = 1;
    const VOTE_HASH = ethers.keccak256(ethers.toUtf8Bytes("test-vote-hash"));

    beforeEach(async function () {
        [admin, voter1, voter2] = await ethers.getSigners();

        const VoteLedger = await ethers.getContractFactory("VoteLedger");
        voteLedger = await VoteLedger.deploy();
        await voteLedger.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the deployer as admin", async function () {
            expect(await voteLedger.admin()).to.equal(admin.address);
        });
    });

    describe("Election Management", function () {
        it("Should create an election", async function () {
            const startTime = Math.floor(Date.now() / 1000);
            const endTime = startTime + 86400; // 24 hours

            await expect(voteLedger.createElection(ELECTION_ID, startTime, endTime))
                .to.emit(voteLedger, "ElectionCreated")
                .withArgs(ELECTION_ID, startTime, endTime);

            const election = await voteLedger.getElection(ELECTION_ID);
            expect(election.exists).to.be.true;
            expect(election.isActive).to.be.false;
        });

        it("Should not allow non-admin to create election", async function () {
            const startTime = Math.floor(Date.now() / 1000);
            const endTime = startTime + 86400;

            await expect(
                voteLedger.connect(voter1).createElection(ELECTION_ID, startTime, endTime)
            ).to.be.revertedWithCustomError(voteLedger, "OnlyAdmin");
        });

        it("Should activate an election", async function () {
            const startTime = Math.floor(Date.now() / 1000);
            const endTime = startTime + 86400;

            await voteLedger.createElection(ELECTION_ID, startTime, endTime);

            await expect(voteLedger.activateElection(ELECTION_ID))
                .to.emit(voteLedger, "ElectionActivated")
                .withArgs(ELECTION_ID);

            const election = await voteLedger.getElection(ELECTION_ID);
            expect(election.isActive).to.be.true;
        });

        it("Should close an election", async function () {
            const startTime = Math.floor(Date.now() / 1000);
            const endTime = startTime + 86400;

            await voteLedger.createElection(ELECTION_ID, startTime, endTime);
            await voteLedger.activateElection(ELECTION_ID);

            await expect(voteLedger.closeElection(ELECTION_ID))
                .to.emit(voteLedger, "ElectionClosed");

            const election = await voteLedger.getElection(ELECTION_ID);
            expect(election.isActive).to.be.false;
        });
    });

    describe("Voting", function () {
        beforeEach(async function () {
            // Set up an active election that spans from past to future
            const startTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
            const endTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

            await voteLedger.createElection(ELECTION_ID, startTime, endTime);
            await voteLedger.activateElection(ELECTION_ID);
        });

        it("Should allow voting in active election", async function () {
            await expect(voteLedger.connect(voter1).submitVote(ELECTION_ID, VOTE_HASH))
                .to.emit(voteLedger, "VoteSubmitted")
                .withArgs(ELECTION_ID, voter1.address, VOTE_HASH, await getBlockTimestamp());

            expect(await voteLedger.getVoteCount(ELECTION_ID)).to.equal(1);
            expect(await voteLedger.hasAddressVoted(ELECTION_ID, voter1.address)).to.be.true;
        });

        it("Should prevent double voting", async function () {
            await voteLedger.connect(voter1).submitVote(ELECTION_ID, VOTE_HASH);

            const newHash = ethers.keccak256(ethers.toUtf8Bytes("another-vote"));
            await expect(
                voteLedger.connect(voter1).submitVote(ELECTION_ID, newHash)
            ).to.be.revertedWithCustomError(voteLedger, "AlreadyVoted");
        });

        it("Should allow different voters to vote", async function () {
            const hash1 = ethers.keccak256(ethers.toUtf8Bytes("vote-1"));
            const hash2 = ethers.keccak256(ethers.toUtf8Bytes("vote-2"));

            await voteLedger.connect(voter1).submitVote(ELECTION_ID, hash1);
            await voteLedger.connect(voter2).submitVote(ELECTION_ID, hash2);

            expect(await voteLedger.getVoteCount(ELECTION_ID)).to.equal(2);
        });

        it("Should verify vote exists", async function () {
            await voteLedger.connect(voter1).submitVote(ELECTION_ID, VOTE_HASH);

            expect(await voteLedger.verifyVote(VOTE_HASH)).to.be.true;
            expect(await voteLedger.verifyVote(
                ethers.keccak256(ethers.toUtf8Bytes("non-existent"))
            )).to.be.false;
        });

        it("Should not allow voting in inactive election", async function () {
            await voteLedger.closeElection(ELECTION_ID);

            await expect(
                voteLedger.connect(voter1).submitVote(ELECTION_ID, VOTE_HASH)
            ).to.be.revertedWithCustomError(voteLedger, "ElectionNotActive");
        });
    });

    // Helper function to get current block timestamp
    async function getBlockTimestamp() {
        const block = await ethers.provider.getBlock("latest");
        return block.timestamp;
    }
});

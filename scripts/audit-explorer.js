/**
 * VoteChainAI - Audit Explorer
 * Interactive vote verification and audit trail viewer
 */

(function () {
    'use strict';

    // Mock audit data for demo purposes
    const MOCK_VOTES = {
        'VOTE-2024-A7B3C9': {
            id: 'VOTE-2024-A7B3C9',
            hash: '0x8a7d...3f2e1b',
            fullHash: '0x8a7d4c5b9e2f1a3d6c8b7e4f5a2c9d1e6b3f2e1b',
            timestamp: '2024-11-05T14:32:17Z',
            blockNumber: 847291,
            verified: true,
            publicData: {
                jurisdiction: 'District 7',
                electionType: 'General Election 2024',
                pollStation: 'PS-142-A'
            },
            timeline: [
                { event: 'Vote Cast', time: '14:32:17' },
                { event: 'Encrypted & Signed', time: '14:32:18' },
                { event: 'Added to Block #847291', time: '14:32:45' },
                { event: 'Consensus Verified', time: '14:33:02' }
            ]
        },
        'VOTE-2024-D4E5F6': {
            id: 'VOTE-2024-D4E5F6',
            hash: '0x2c9d...7a4b8e',
            fullHash: '0x2c9d1e6b3f2e1b8a7d4c5b9e2f1a3d6c8b7a4b8e',
            timestamp: '2024-11-05T09:15:42Z',
            blockNumber: 847156,
            verified: true,
            publicData: {
                jurisdiction: 'District 3',
                electionType: 'General Election 2024',
                pollStation: 'PS-089-B'
            },
            timeline: [
                { event: 'Vote Cast', time: '09:15:42' },
                { event: 'Encrypted & Signed', time: '09:15:43' },
                { event: 'Added to Block #847156', time: '09:16:15' },
                { event: 'Consensus Verified', time: '09:16:38' }
            ]
        }
    };

    const AuditExplorer = {
        init() {
            this.form = document.querySelector('.audit-explorer__form');
            this.input = document.querySelector('.audit-explorer__input');
            this.resultContainer = document.querySelector('.audit-explorer__result-container');

            if (!this.form || !this.input) return;

            // Pre-populate with a sample vote ID
            this.input.placeholder = 'Enter Vote ID (e.g., VOTE-2024-A7B3C9)';

            // Bind form submission
            this.form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.lookupVote();
            });

            // Show demo result on load
            this.displayResult(MOCK_VOTES['VOTE-2024-A7B3C9']);
        },

        lookupVote() {
            const voteId = this.input.value.trim().toUpperCase();

            if (!voteId) {
                this.showError('Please enter a Vote ID');
                return;
            }

            const vote = MOCK_VOTES[voteId];

            if (vote) {
                this.displayResult(vote);
            } else {
                this.showError(`Vote ID "${voteId}" not found. Try: VOTE-2024-A7B3C9`);
            }
        },

        displayResult(vote) {
            if (!this.resultContainer) return;

            this.resultContainer.innerHTML = `
        <div class="audit-explorer__result" data-animate>
          <div class="audit-explorer__result-row">
            <span class="audit-explorer__label">Vote ID</span>
            <span class="audit-explorer__value">${vote.id}</span>
          </div>
          <div class="audit-explorer__result-row">
            <span class="audit-explorer__label">Hash</span>
            <span class="audit-explorer__value audit-explorer__value--hash">${vote.hash}</span>
          </div>
          <div class="audit-explorer__result-row">
            <span class="audit-explorer__label">Block</span>
            <span class="audit-explorer__value">#${vote.blockNumber}</span>
          </div>
          <div class="audit-explorer__result-row">
            <span class="audit-explorer__label">Status</span>
            <span class="audit-explorer__value audit-explorer__value--verified">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Verified
            </span>
          </div>
          
          <div class="audit-explorer__public-data">
            <div class="audit-explorer__result-row">
              <span class="audit-explorer__label">Jurisdiction</span>
              <span class="audit-explorer__value">${vote.publicData.jurisdiction}</span>
            </div>
            <div class="audit-explorer__result-row">
              <span class="audit-explorer__label">Election</span>
              <span class="audit-explorer__value">${vote.publicData.electionType}</span>
            </div>
            <div class="audit-explorer__result-row">
              <span class="audit-explorer__label">Poll Station</span>
              <span class="audit-explorer__value">${vote.publicData.pollStation}</span>
            </div>
          </div>
          
          <div class="audit-explorer__timeline">
            <h4 class="audit-explorer__timeline-title">Verification Timeline</h4>
            <div class="audit-explorer__timeline-items">
              ${vote.timeline.map(item => `
                <div class="audit-explorer__timeline-item">
                  <span class="audit-explorer__timeline-dot"></span>
                  <span class="audit-explorer__timeline-text">${item.event}</span>
                  <span class="audit-explorer__timeline-time">${item.time}</span>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div class="audit-explorer__privacy-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Ballot contents are encrypted and never disclosed. Only public metadata is shown.</span>
          </div>
        </div>
      `;

            // Trigger animation
            setTimeout(() => {
                const result = this.resultContainer.querySelector('.audit-explorer__result');
                result?.classList.add('is-visible');
            }, 50);
        },

        showError(message) {
            if (!this.resultContainer) return;

            this.resultContainer.innerHTML = `
        <div class="audit-explorer__error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>${message}</span>
        </div>
      `;
        }
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        AuditExplorer.init();
    });

})();

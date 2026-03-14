# Rakshak Pitch Deck (Refined)

## Slide 1: The Problem
### Losing a crypto key can lock funds forever
Crypto wallets are secure, but unforgiving. If a private key is lost, funds can become permanently inaccessible.

This is a serious risk for:
- NGOs receiving donations
- DAOs managing treasury funds
- Web3 startups holding operational crypto

**Example:** In real incidents, organizations lost access to large treasury amounts because key access was lost.

**Speaker line:** Crypto is secure, but if the key is lost, the funds may be lost forever.

---

## Slide 2: What Already Exists
Many institutions already rely on BitGo for security.

BitGo provides:
- Multi-signature wallets
- Secure transaction signing
- Enterprise-grade wallet infrastructure
- APIs/SDK for wallet operations

Our demo runs on Arbitrum.

**Key point:** Security infrastructure exists. Operational recovery workflow is still difficult for non-technical teams.

---

## Slide 3: The Missing Piece
### Security alone does not solve operational continuity
Even with secure wallets, organizations still face failure modes when key owners are unavailable.

What is missing:
- A simple, non-technical recovery workflow
- Team-based approval for recovery actions
- A clear process when a key holder is unavailable

**Result today:** Funds may be secure, but treasury operations can halt.

---

## Slide 4: Our Solution — Rakshak
### Rakshak: Institutional Security, Team Simplicity.
Rakshak is an orchestration layer on top of BitGo. It turns technical wallet operations into a product workflow for PMs/leads.

How it works:
1. Team creates a BitGo wallet from Rakshak dashboard
2. Team configures 3 trusted guardians
3. If key access is lost, user raises recovery request
4. Guardians review request via email links
5. At least 2 approvals unlock recovery execution
6. Funds are moved to a new safe address

**Important:** Rakshak does not replace BitGo. It adds a human approval and recovery layer above BitGo custody.

---

## Slide 5: Architecture
### Orchestrator model
**Institution Team Dashboard** -> **Rakshak Backend (policy + guardian approvals)** -> **BitGo SDK/APIs (wallet + signing)** -> **Arbitrum Network**

Explanation:
- Teams use Rakshak UI, not raw SDK complexity
- Rakshak manages approvals, workflow state, and audit trail
- BitGo handles secure wallet and transaction primitives
- Final transactions settle on Arbitrum

**Outcome:** Institutional-grade custody with operationally usable controls.

---

## Slide 6: Demo Flow
In demo, we show:
1. Create BitGo multisig wallet
2. Generate/use wallet receive address
3. Add 3 guardians
4. Raise recovery request
5. Guardians approve via email links
6. Execute recovery after 2 approvals
7. Transfer funds to recovery address

Also shown:
- Transaction page for normal treasury transfers
- Dashboard-led flow suitable for PM/ops teams

---

## Slide 7: Vision & Closing
### Product Category
Operational recovery and treasury orchestration layer for institutional crypto teams.

### Vision
Make crypto treasury operations both secure and recoverable.

### What Rakshak provides
- Guardian-approved recovery workflow
- Built on BitGo institutional wallet infrastructure
- Reduced dependency on deep SDK expertise
- Continuity when key owners are unavailable

### Closing statement
In crypto, losing a key should not mean losing access forever. Rakshak gives institutions a safe way back.

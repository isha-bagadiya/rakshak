I am building a Web3 hackathon project focused on BitGo integration.

Project idea: **Wallet Lifecycle & Recovery Manager built on BitGo wallets**

Problem:
In crypto, if someone loses their private key or seed phrase, the funds are permanently lost. Also, organizations often create wallets for employees or contributors, but when those users leave or become inactive, the wallets and funds remain unmanaged.

Solution:
Build a system that adds lifecycle management to BitGo wallets.

Main features:

* Create multi-sig wallets using BitGo SDK
* Assign guardians (e.g., CTO, security wallet, or trusted addresses)
* Require guardian approvals for sensitive actions
* Monitor wallet inactivity
* If a wallet becomes inactive for a defined period, trigger a recovery process
* Guardians can approve recovery and transfer funds to a backup wallet or organization treasury

Goal:
Create a policy-driven wallet management system using BitGo infrastructure that prevents permanent asset loss and enables secure recovery and treasury control.

Tech stack:

* Node.js backend
* BitGo SDK
* Next.js frontend
* Ethers.js / Web3 libraries

flow:
Guardian-Based Recovery
Users can assign trusted guardians.
Examples:
Personal user
Guardian 1: friend
Guardian 2: sibling
Guardian 3: spouse

If user loses access:
Guardians approve → wallet ownership transferred.
Organizations can act as guardians.
Example employee wallet:
Owner: Employee
Guardian 1: CTO wallet
Guardian 2: Security wallet
Guardian 3: HR wallet

Recovery rule:
2 of 3 guardians approve → ownership transfer

Use cases:
employee lost wallet
employee left company
account compromised
Wallets can define inactivity rules.
Example:
if wallet inactive for 12 months
→ trigger inactivity process

Possible outcomes:
For organization wallets
assets → organization treasury

For personal wallets
assets → backup wallet or nominee

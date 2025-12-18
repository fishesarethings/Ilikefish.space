// .github/scripts/update-ud.js
// Node script to update Unstoppable domain record dweb.ipfs.hash
// Usage: set env DOMAIN, CID, OWNER_ADDRESS, PRIVATE_KEY

const axios = require('axios');
const { ethers } = require('ethers');

async function main() {
  const domain = process.env.DOMAIN;
  const cid = process.env.CID;
  const owner = process.env.OWNER_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;

  if (!domain || !cid || !owner || !privateKey) {
    console.error('Missing required env vars. Ensure DOMAIN, CID, OWNER_ADDRESS, PRIVATE_KEY are set.');
    process.exit(1);
  }

  try {
    const base = 'https://api.unstoppabledomains.com/profile';
    const expiry = (Date.now() + 5*60*1000).toString();

    // 1) get message to sign
    const sigResp = await axios.get(`${base}/user/${encodeURIComponent(domain)}/signature?device=true&expiry=${expiry}`);
    if (!sigResp.data || !sigResp.data.message) {
      console.error('No message returned to sign:', sigResp.data);
      process.exit(1);
    }
    const message = sigResp.data.message;

    // sign with private key
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(message);

    // 2) call records/manage to set dweb.ipfs.hash
    const manageURL = `${base}/user/${encodeURIComponent(domain)}/records/manage`;
    const manageResp = await axios.post(manageURL,
      {
        address: owner,
        records: { "dweb.ipfs.hash": cid }
      },
      {
        headers: {
          'x-auth-domain': domain,
          'x-auth-expires': expiry,
          'x-auth-signature': signature,
          'content-type': 'application/json'
        }
      }
    );

    console.log('manageResp.data:', JSON.stringify(manageResp.data, null, 2));

    // 3) Handle on-chain dependency if present
    const operation = manageResp.data && manageResp.data.operation;
    if (operation && operation.dependencies && operation.dependencies.length) {
      // find first dependency requiring a signature / tx
      const dep = operation.dependencies.find(d => d.transaction && d.transaction.messageToSign && d.transaction.hash);
      if (dep) {
        console.log('Found on-chain dependency, signing and confirming...');
        const messageToSign = dep.transaction.messageToSign;
        const txHash = dep.transaction.hash;

        const signed = await wallet.signMessage(messageToSign);

        const confirmURL = `${base}/user/${encodeURIComponent(domain)}/records/confirm`;
        const confirmResp = await axios.post(confirmURL,
          {
            operationId: operation.id,
            dependencyId: dep.id,
            signature: signed,
            txHash: txHash
          },
          {
            headers: {
              'x-auth-domain': domain,
              'x-auth-expires': expiry,
              'x-auth-signature': signature,
              'content-type': 'application/json'
            }
          }
        );
        console.log('confirmResp.data:', JSON.stringify(confirmResp.data, null, 2));
      } else {
        console.log('No signable on-chain dependency found in operation. Operation data:', JSON.stringify(operation, null, 2));
      }
    } else {
      console.log('No on-chain dependencies returned; likely record updated off-chain or handled by custody.');
    }

    console.log('Update finished. Domain:', domain, 'CID:', cid);
  } catch (err) {
    console.error('Error updating UD record:', err.response ? err.response.data || err.response.statusText : err.message);
    process.exit(1);
  }
}

main();

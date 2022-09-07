import fetch from 'node-fetch';

const TZKT_API = 'https://api.tzkt.io/v1';
const MATTER = 'KT1K4jn23GonEmZot3pMGth7unnzZ6EaMVjY'; 

const fetchAccountsInternal = async () => {
  const res = await fetch(`${TZKT_API}/contracts/${MATTER}/bigmaps/accounts_internal/keys?limit=1000`);
  return res.json();
}
import fetch from 'node-fetch';
import { 
  TZKT_API, 
  MATTER 
} from './api.js';

export const fetchTokenName = async (contract) => {
  const req = `${TZKT_API}/contracts/${contract}`;
  const res = await (await fetch(req)).json();
  
  const tokenName = res.alias;

  return tokenName;
}

export const fetchSupply = async (contract, id) => {
  const req = `${TZKT_API}/tokens/?contract=${contract}${id ? `&tokenId=${id}` : ``}`;
  const res = await (await fetch(req)).json();
  
  const supply = Number(res[0].totalSupply);

  return supply;
}

export const fetchAccountsInternal = async () => {
  const req = `${TZKT_API}/contracts/${MATTER}/bigmaps/accounts_internal/keys?limit=1000`;
  const res = await (await fetch(req)).json();

  return res;
}

export const fetchMatterConfigs = async () => {
  const req = `${TZKT_API}/contracts/${MATTER}/storage/`;
  const res = await (await fetch(req)).json();
  
  const configs = res.configs;

  return configs;
}

export const fetchMatterFarms = async () => {
  const req = `${TZKT_API}/contracts/${MATTER}/bigmaps/farms_internal/keys`;
  const res = await (await fetch(req)).json();

  const farms = await Promise.all(
    res.map(async farm => ({
      symbol: await fetchTokenName(farm.key.fa2_address),
      key: farm.key,
      value: farm.value,
      supply: await fetchSupply(farm.key.fa2_address, farm.key.token_id),
    }))
  );

  return farms;
}
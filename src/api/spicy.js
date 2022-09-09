import fetch from 'node-fetch';
import { 
  SPICY_API, 
  MATTER 
} from './api.js';

const calculateDayAgg = () => {
  const agg_start = new Date();
  agg_start.setDate(agg_start.getDate() - 7);

  return Math.floor(agg_start.getTime() / 1000);
}

export const fetchMatterPrice = async (agg = calculateDayAgg()) => {
  const req = `${SPICY_API}/TokenList?_ilike=${MATTER}:0&day_agg_start=${agg}`;
  const res = await (await fetch(req)).json();
  
  const price = res.tokens[0].derivedxtz;
  return price;
}

export const fetchSpicyTokens = async (agg = calculateDayAgg()) => {
  const req = `${SPICY_API}/TokenList?day_agg_start=${agg}`;
  const res = await (await fetch(req)).json();
  
  const spicyTokens = res.tokens;
  return spicyTokens;
}

export const fetchSpicyPools = async () => {
  const res = await (await fetch(`${SPICY_API}/PoolListAll/`)).json();
  const pools = res.pair_info;
  
  const spicyPools = pools.map(pool => ({
    contract: pool.contract, 
    reserve: pool.reservextz, 
    token0: pool.token0, 
    token1: pool.token1
  }))

  return spicyPools;
}
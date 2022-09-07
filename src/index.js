import fetch from 'node-fetch';

const TZKT_API = 'https://api.tzkt.io/v1';
const SPICY_API = 'https://spicyb.sdaotools.xyz/api/rest';
const MATTER = 'KT1K4jn23GonEmZot3pMGth7unnzZ6EaMVjY';

const fetchMatterPrice = async (agg) => {
  const res = await fetch(`${SPICY_API}/TokenList?_ilike=${MATTER}:0&day_agg_start=${agg}`);
  const json = await res.json();

  return json.tokens[0].derivedxtz;
}

const fetchAccountsInternal = async () => {
  const res = await fetch(`${TZKT_API}/contracts/${MATTER}/bigmaps/accounts_internal/keys?limit=1000`);
  return res.json();
}

const mapAccounts = async () => {
  const accounts = await fetchAccountsInternal();

  const mapped = accounts.reduce((map, current) => {
    const address = current.key.user_address;
    const grouped = map.get(address);

    current.totalReward = BigInt(current.value.reward);

    if(!grouped) {
      map.set(address, { 
        totalReward: current.totalReward, 
        farms: {
          ...current.farms, 
          [current.key.token.fa2_address]: { 
            tokenId: current.key.token.token_id,
            reward: BigInt(current.value.reward), 
            staked: BigInt(current.value.staked)
          }
        }
      });
    } else {
      map.set(address, { 
        ...grouped, 
        totalReward: BigInt(grouped.totalReward) + BigInt(current.totalReward), 
        farms: {
          ...grouped.farms, 
          [current.key.token.fa2_address]: {
            tokenId: current.key.token.token_id,
            reward: BigInt(current.value.reward), 
            staked: BigInt(current.value.staked)
          }
        }
      });
    }

    return map;
  }, new Map);

  return mapped;
}

const sortAccounts = (accounts, descend) => {
  const sort = new Map(
    Array.from(accounts).sort((a, b) => {
      if(a[1].totalReward > b[1].totalReward) {
        return descend ? -1 : 1;
      } else {
        return descend ? 1 : -1;
      }
    })
  );

  return sort;
}

const calculateDayAgg = () => {
  const agg_start = new Date();
  agg_start.setDate(agg_start.getDate() - 7);

  return Math.floor(agg_start.getTime() / 1000);
}

const start = async () => {
  const accounts = await mapAccounts();
  const sorted = sortAccounts(accounts, true);

  const matterPrice = await fetchMatterPrice(calculateDayAgg());
}

start();
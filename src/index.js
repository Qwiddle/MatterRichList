import BigNumber from 'bignumber.js';
import { fetchMatterConfigs,
  fetchMatterFarms,
  fetchAccountsInternal,
} from './api/tzkt.js';
import { fetchSpicyPools,
  fetchSpicyTokens,
  fetchMatterPrice
} from './api/spicy.js';

const fetchAndMatchFarms = async (spicyPools, spicyTokens) => {
  const farms = await fetchMatterFarms();
  const configs = await fetchMatterConfigs();

  const today = new Date;
  const active = new Date(configs[0].active_time);

  let activeConfig = today.getTime() >= active.getTime() ?
    configs[0].farm_configs : 
    configs[1].farm_configs

  const mapped = farms.reduce((a, p) => {
    const findToken = spicyTokens.find(token => token.tag === `${p.key.fa2_address}:${p.key.token_id}`);
    const findPool = spicyPools.find(pool => pool.contract === p.key.fa2_address);
    const findConfig = activeConfig.find(config => config.key.fa2_address === p.key.fa2_address);

    if (findConfig) {
      a.push({
        ...p,
        decimals: findToken ? findToken.decimals: 18, 
        token0: findPool ? findPool.token0 : findConfig.key.fa2_address,
        token1: findPool ? findPool.token1 : null,
        reserveXtz: findPool ? findPool.reserve : null,
        derivedXtz: findToken ? findToken.derivedxtz: null,
        single: findPool ? false : false,
        rps: Number(findConfig.value.reward_per_sec),
      });
    }

    return a;
  }, []);

  return mapped;
}

const mapAccounts = async () => {
  const accounts = await fetchAccountsInternal();

  const mapped = accounts.reduce((map, current) => {
    const address = current.key.user_address;
    const grouped = map.get(address);

    current.totalReward = BigNumber(current.value.reward);

    if(!grouped) {
      map.set(address, { 
        totalReward: current.totalReward,
        farms: {
          ...current.farms, 
          [current.key.token.fa2_address]: { 
            tokenId: current.key.token.token_id,
            reward: BigNumber(current.value.reward), 
            staked: BigNumber(current.value.staked).shiftedBy(-12)
          }
        }
      });
    } else {
      map.set(address, { 
        ...grouped, 
        totalReward: BigNumber(grouped.totalReward).plus(BigNumber(current.totalReward)), 
        farms: {
          ...grouped.farms, 
          [current.key.token.fa2_address]: {
            tokenId: current.key.token.token_id,
            reward: BigNumber(current.value.reward), 
            staked: BigNumber(current.value.staked).shiftedBy(-18)
          }
        }
      });
    }

    return map;
  }, new Map);

  return mapped;
}

const sortAccounts = (accounts, descend = true) => {
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

const start = async () => {
  const accounts = await mapAccounts();
  const sorted = sortAccounts(accounts);

  const spicyPools = await fetchSpicyPools();
  const spicyTokens = await fetchSpicyTokens();
  const farms = await fetchAndMatchFarms(spicyPools, spicyTokens);
}

start();
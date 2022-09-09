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
        key: p.key,
        value: p.value,
        ...(findPool && { 
          pool: { 
            symbol: p.symbol,
            supply: p.supply,
            ...findPool,
            decimals: 18
          } 
        }),
        ...(findToken && { 
          token: { 
            supply: p.supply,
            ...findToken,
          } 
        }),
        single: findPool ? false : true,
        rps: Number(findConfig.value.reward_per_sec),
      });
    }

    return a;
  }, []);

  return mapped;
}

const mapAccounts = async (farms) => {
  const accounts = await fetchAccountsInternal();

  const mapped = accounts.reduce((map, current) => {
    const address = current.key.user_address;
    const grouped = map.get(address);

    const farm = farms.find(farm => farm.key.fa2_address === current.key.token.fa2_address);
    const farmValue = farm && current.value.staked != 0 ? Number(lpToTez(BigNumber(current.value.staked), farm)) : 0;
 
    current.totalValue = Number(farmValue);

    if(!grouped) {
      map.set(address, { 
        totalValue: current.totalValue,
        farms: {
          ...current.farms, 
          [current.key.token.fa2_address]: { 
            tokenId: current.key.token.token_id,
            reward: BigNumber(current.value.reward), 
            staked: BigNumber(current.value.staked),
            value: Number(farmValue)
          }
        }
      });
    } else {
      map.set(address, { 
        ...grouped, 
        totalValue: Number(grouped.totalValue) + Number(current.totalValue), 
        farms: {
          ...grouped.farms, 
          [current.key.token.fa2_address]: {
            tokenId: current.key.token.token_id,
            reward: BigNumber(current.value.reward), 
            staked: BigNumber(current.value.staked),
            value: Number(farmValue)
          }
        }
      });
    }

    return map;
  }, new Map);

  return mapped;
}

const lpToTez = (staked, farm) => {
  if(!farm.single) {
    const { reserve, supply, decimals } = farm.pool;

    const tezPerLp = BigNumber(reserve).dividedBy(BigNumber(supply).shiftedBy(-decimals));
    const lpValue = tezPerLp.multipliedBy(staked.shiftedBy(-decimals));

    return lpValue.toFixed(2);
  } else {
    const { derivedXtz, decimals } = farm.token;

    const tokenValue = BigNumber(derivedXtz).multipliedBy(staked.shiftedBy(-decimals));
    return tokenValue.toFixed(2);
  }
}

const sortAccounts = (accounts, descend = true) => {
  const sort = new Map(
    Array.from(accounts).sort((a, b) => {
      if(a[1].totalValue > b[1].totalValue) {
        return descend ? -1 : 1;
      } else {
        return descend ? 1 : -1;
      }
    })
  );

  return sort;
}

const start = async () => {
  const spicyPools = await fetchSpicyPools();
  const spicyTokens = await fetchSpicyTokens();
  const farms = await fetchAndMatchFarms(spicyPools, spicyTokens);

  const accounts = await mapAccounts(farms);
  const sorted = sortAccounts(accounts);
}

start();
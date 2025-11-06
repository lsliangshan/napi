import { bossCity } from "../basedata/boss_city";

export function getBossCityCodeByName(name: string) {
  let index = [-1, -1];

  bossCity.forEach((city, i) => {
    city.cityList.forEach((c, j) => {
      if (c.name === name) {
        index = [i, j];
      }
    });
  });

  if (index[0] === -1 || index[1] === -1) {
    return 0;
  }

  return bossCity[index[0]].cityList[index[1]].code;
}
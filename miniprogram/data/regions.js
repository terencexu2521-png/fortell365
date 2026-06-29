/** 省 / 市 / 区 经度数据（真太阳时） */
function city(name, lng, districts) {
  return {
    name,
    lng,
    districts: districts || [{ name: '市辖区', lng }],
  };
}

const provinces = [
  {
    name: '北京市',
    cities: [
      city('北京市', 116.41, [
        { name: '东城区', lng: 116.42 },
        { name: '西城区', lng: 116.37 },
        { name: '朝阳区', lng: 116.44 },
        { name: '海淀区', lng: 116.3 },
        { name: '丰台区', lng: 116.29 },
        { name: '石景山区', lng: 116.22 },
        { name: '通州区', lng: 116.66 },
        { name: '昌平区', lng: 116.23 },
      ]),
    ],
  },
  {
    name: '上海市',
    cities: [
      city('上海市', 121.47, [
        { name: '黄浦区', lng: 121.49 },
        { name: '徐汇区', lng: 121.44 },
        { name: '长宁区', lng: 121.42 },
        { name: '静安区', lng: 121.45 },
        { name: '浦东新区', lng: 121.54 },
        { name: '闵行区', lng: 121.38 },
        { name: '宝山区', lng: 121.49 },
        { name: '嘉定区', lng: 121.27 },
      ]),
    ],
  },
  {
    name: '天津市',
    cities: [city('天津市', 117.2, [{ name: '和平区', lng: 117.21 }, { name: '河西区', lng: 117.22 }, { name: '南开区', lng: 117.15 }, { name: '滨海新区', lng: 117.71 }])],
  },
  {
    name: '重庆市',
    cities: [city('重庆市', 106.55, [{ name: '渝中区', lng: 106.57 }, { name: '江北区', lng: 106.57 }, { name: '南岸区', lng: 106.56 }, { name: '渝北区', lng: 106.63 }])],
  },
  {
    name: '浙江省',
    cities: [
      city('杭州市', 120.15, [
        { name: '上城区', lng: 120.17 },
        { name: '拱墅区', lng: 120.14 },
        { name: '西湖区', lng: 120.13 },
        { name: '滨江区', lng: 120.21 },
        { name: '萧山区', lng: 120.27 },
        { name: '余杭区', lng: 120.3 },
        { name: '临平区', lng: 120.3 },
        { name: '富阳区', lng: 119.96 },
      ]),
      city('宁波市', 121.55, [{ name: '海曙区', lng: 121.55 }, { name: '江北区', lng: 121.56 }, { name: '鄞州区', lng: 121.55 }, { name: '北仑区', lng: 121.85 }]),
      city('温州市', 120.7, [{ name: '鹿城区', lng: 120.66 }, { name: '龙湾区', lng: 120.81 }, { name: '瓯海区', lng: 120.62 }]),
    ],
  },
  {
    name: '江苏省',
    cities: [
      city('南京市', 118.78, [{ name: '玄武区', lng: 118.8 }, { name: '秦淮区', lng: 118.79 }, { name: '建邺区', lng: 118.73 }, { name: '鼓楼区', lng: 118.77 }, { name: '江宁区', lng: 118.84 }]),
      city('苏州市', 120.62, [{ name: '姑苏区', lng: 120.62 }, { name: '虎丘区', lng: 120.57 }, { name: '吴中区', lng: 120.63 }, { name: '相城区', lng: 120.64 }, { name: '工业园区', lng: 120.72 }]),
      city('无锡市', 120.31, [{ name: '梁溪区', lng: 120.3 }, { name: '滨湖区', lng: 120.28 }, { name: '新吴区', lng: 120.36 }]),
    ],
  },
  {
    name: '广东省',
    cities: [
      city('广州市', 113.26, [{ name: '荔湾区', lng: 113.24 }, { name: '越秀区', lng: 113.27 }, { name: '天河区', lng: 113.36 }, { name: '海珠区', lng: 113.32 }, { name: '白云区', lng: 113.27 }]),
      city('深圳市', 114.07, [{ name: '福田区', lng: 114.05 }, { name: '罗湖区', lng: 114.13 }, { name: '南山区', lng: 113.93 }, { name: '宝安区', lng: 113.88 }, { name: '龙岗区', lng: 114.25 }]),
      city('东莞市', 113.75, [{ name: '东城街道', lng: 113.78 }, { name: '南城街道', lng: 113.75 }, { name: '莞城街道', lng: 113.75 }]),
    ],
  },
  {
    name: '四川省',
    cities: [city('成都市', 104.07, [{ name: '锦江区', lng: 104.08 }, { name: '青羊区', lng: 104.06 }, { name: '武侯区', lng: 104.04 }, { name: '成华区', lng: 104.1 }, { name: '高新区', lng: 104.07 }])],
  },
  {
    name: '湖北省',
    cities: [city('武汉市', 114.31, [{ name: '江岸区', lng: 114.31 }, { name: '江汉区', lng: 114.27 }, { name: '武昌区', lng: 114.32 }, { name: '洪山区', lng: 114.34 }, { name: '汉阳区', lng: 114.22 }])],
  },
  {
    name: '湖南省',
    cities: [city('长沙市', 112.94, [{ name: '芙蓉区', lng: 113.03 }, { name: '天心区', lng: 112.99 }, { name: '岳麓区', lng: 112.93 }, { name: '开福区', lng: 112.99 }])],
  },
  {
    name: '福建省',
    cities: [
      city('福州市', 119.3, [{ name: '鼓楼区', lng: 119.3 }, { name: '台江区', lng: 119.31 }, { name: '仓山区', lng: 119.32 }]),
      city('厦门市', 118.09, [{ name: '思明区', lng: 118.08 }, { name: '湖里区', lng: 118.13 }, { name: '集美区', lng: 118.1 }]),
    ],
  },
  {
    name: '山东省',
    cities: [
      city('济南市', 117.0, [{ name: '历下区', lng: 117.08 }, { name: '市中区', lng: 116.99 }, { name: '槐荫区', lng: 116.9 }]),
      city('青岛市', 120.38, [{ name: '市南区', lng: 120.38 }, { name: '市北区', lng: 120.37 }, { name: '崂山区', lng: 120.47 }]),
    ],
  },
  {
    name: '河南省',
    cities: [city('郑州市', 113.65, [{ name: '中原区', lng: 113.61 }, { name: '二七区', lng: 113.64 }, { name: '金水区', lng: 113.66 }])],
  },
  {
    name: '河北省',
    cities: [city('石家庄市', 114.52, [{ name: '长安区', lng: 114.54 }, { name: '桥西区', lng: 114.46 }, { name: '裕华区', lng: 114.53 }])],
  },
  {
    name: '陕西省',
    cities: [city('西安市', 108.95, [{ name: '新城区', lng: 108.96 }, { name: '碑林区', lng: 108.93 }, { name: '雁塔区', lng: 108.93 }, { name: '未央区', lng: 108.95 }])],
  },
  {
    name: '辽宁省',
    cities: [city('沈阳市', 123.43, [{ name: '和平区', lng: 123.42 }, { name: '沈河区', lng: 123.46 }, { name: '浑南区', lng: 123.45 }])],
  },
  {
    name: '安徽省',
    cities: [city('合肥市', 117.27, [{ name: '庐阳区', lng: 117.26 }, { name: '蜀山区', lng: 117.26 }, { name: '包河区', lng: 117.31 }])],
  },
  {
    name: '江西省',
    cities: [city('南昌市', 115.89, [{ name: '东湖区', lng: 115.9 }, { name: '西湖区', lng: 115.87 }, { name: '红谷滩区', lng: 115.85 }])],
  },
  {
    name: '云南省',
    cities: [city('昆明市', 102.73, [{ name: '五华区', lng: 102.71 }, { name: '盘龙区', lng: 102.72 }, { name: '官渡区', lng: 102.75 }])],
  },
  {
    name: '贵州省',
    cities: [city('贵阳市', 106.63, [{ name: '南明区', lng: 106.71 }, { name: '云岩区', lng: 106.71 }, { name: '观山湖区', lng: 106.62 }])],
  },
  {
    name: '广西壮族自治区',
    cities: [city('南宁市', 108.37, [{ name: '青秀区', lng: 108.37 }, { name: '兴宁区', lng: 108.37 }, { name: '西乡塘区', lng: 108.31 }])],
  },
  {
    name: '海南省',
    cities: [city('海口市', 110.35, [{ name: '秀英区', lng: 110.29 }, { name: '龙华区', lng: 110.33 }, { name: '美兰区', lng: 110.37 }])],
  },
  {
    name: '甘肃省',
    cities: [city('兰州市', 103.82, [{ name: '城关区', lng: 103.83 }, { name: '七里河区', lng: 103.79 }])],
  },
  {
    name: '内蒙古自治区',
    cities: [city('呼和浩特市', 111.75, [{ name: '新城区', lng: 111.76 }, { name: '回民区', lng: 111.62 }, { name: '赛罕区', lng: 111.7 }])],
  },
  {
    name: '新疆维吾尔自治区',
    cities: [city('乌鲁木齐市', 87.62, [{ name: '天山区', lng: 87.63 }, { name: '沙依巴克区', lng: 87.6 }, { name: '水磨沟区', lng: 87.64 }])],
  },
];

function getProvince(index) {
  return provinces[index] || provinces[0];
}

function getCity(provinceIndex, cityIndex) {
  const p = getProvince(provinceIndex);
  return p.cities[cityIndex] || p.cities[0];
}

function getDistrict(provinceIndex, cityIndex, districtIndex) {
  const c = getCity(provinceIndex, cityIndex);
  return c.districts[districtIndex] || c.districts[0];
}

function getLongitude(provinceIndex, cityIndex, districtIndex) {
  return getDistrict(provinceIndex, cityIndex, districtIndex).lng;
}

function formatBirthPlace(provinceIndex, cityIndex, districtIndex) {
  const p = getProvince(provinceIndex);
  const c = getCity(provinceIndex, cityIndex);
  const d = getDistrict(provinceIndex, cityIndex, districtIndex);
  return `${p.name}${c.name}${d.name}`;
}

module.exports = {
  provinces,
  getProvince,
  getCity,
  getDistrict,
  getLongitude,
  formatBirthPlace,
};

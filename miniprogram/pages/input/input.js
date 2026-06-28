const regions = require('../../data/regions.js');

Page({
  data: {
    name: '',
    gender: 'male',
    calendarType: 'solar',
    calendarTypes: [
      { label: '公历', value: 'solar' },
      { label: '农历', value: 'lunar' },
    ],
    calendarIndex: 0,
    date: '1990-01-01',
    time: '08:30',
    provinces: regions.provinces.map((p) => p.name),
    provinceIndex: 4,
    cities: [],
    cityIndex: 0,
    districts: [],
    districtIndex: 0,
    longitude: 120.15,
    birthPlace: '',
    loading: false,
  },

  onLoad() {
    this.syncRegion(4, 0, 0);
  },

  syncRegion(provinceIndex, cityIndex, districtIndex) {
    const city = regions.getCity(provinceIndex, cityIndex);
    const district = regions.getDistrict(provinceIndex, cityIndex, districtIndex);
    this.setData({
      provinceIndex,
      cities: regions.getProvince(provinceIndex).cities.map((c) => c.name),
      cityIndex,
      districts: city.districts.map((d) => d.name),
      districtIndex,
      longitude: district.lng,
      birthPlace: regions.formatBirthPlace(provinceIndex, cityIndex, districtIndex),
    });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value.trim() });
  },

  onGenderChange(e) {
    this.setData({ gender: e.detail.value });
  },

  onCalendarChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      calendarIndex: idx,
      calendarType: this.data.calendarTypes[idx].value,
    });
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value });
  },

  onTimeChange(e) {
    this.setData({ time: e.detail.value });
  },

  onProvinceChange(e) {
    this.syncRegion(Number(e.detail.value), 0, 0);
  },

  onCityChange(e) {
    this.syncRegion(this.data.provinceIndex, Number(e.detail.value), 0);
  },

  onDistrictChange(e) {
    const districtIndex = Number(e.detail.value);
    const { provinceIndex, cityIndex } = this.data;
    this.setData({
      districtIndex,
      longitude: regions.getLongitude(provinceIndex, cityIndex, districtIndex),
      birthPlace: regions.formatBirthPlace(provinceIndex, cityIndex, districtIndex),
    });
  },

  async submitForm() {
    const { name, gender, calendarType, date, time, longitude, birthPlace, provinceIndex, cityIndex, districtIndex } = this.data;
    if (!name) {
      wx.showToast({ title: '请输入姓名', icon: 'none' });
      return;
    }
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const body = {
      name,
      gender,
      calendarType,
      year,
      month,
      day,
      hour,
      minute,
      longitude,
      birthPlace,
      province: regions.getProvince(provinceIndex).name,
      city: regions.getCity(provinceIndex, cityIndex).name,
      district: regions.getDistrict(provinceIndex, cityIndex, districtIndex).name,
    };

    this.setData({ loading: true });
    try {
      const api = require('../../utils/api.js');
      const res = await api.paipan(body);
      const app = getApp();
      app.globalData.birthForm = body;
      app.globalData.paipanResult = res.data;
      wx.navigateTo({ url: '/pages/confirm/confirm' });
    } catch (err) {
      wx.showToast({ title: err.message || '排盘失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});

const { API_BASE, API_BASE_FALLBACK, USE_DEV_LOGIN } = require('../config.js');

function getApiBases() {
  const bases = [API_BASE];
  if (API_BASE_FALLBACK && API_BASE_FALLBACK !== API_BASE) bases.push(API_BASE_FALLBACK);
  return bases;
}

function getToken() {
  return wx.getStorageSync('token') || '';
}

function getProbeDeviceId() {
  let id = wx.getStorageSync('probe_device_id');
  if (!id) {
    id = 'pd_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    wx.setStorageSync('probe_device_id', id);
  }
  return id;
}

function saveAuthResponse(body) {
  const payload = body && body.data;
  if (!payload || !payload.token) {
    throw new Error('登录失败：服务器未返回有效 token（可能需更新 API）');
  }
  wx.setStorageSync('token', payload.token);
  return payload;
}

function request(path, options = {}) {
  const { method = 'GET', data, auth = false } = options;
  const header = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) header.Authorization = 'Bearer ' + token;
  }
  const bases = getApiBases();
  return new Promise((resolve, reject) => {
    let index = 0;
    const tryNext = (err) => {
      if (index >= bases.length) {
        reject(err);
        return;
      }
      const base = bases[index++];
      wx.request({
        url: base + path,
        method,
        data,
        header,
        success(res) {
          const body = res.data;
          if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success === true) {
            resolve(body);
            return;
          }
          tryNext(new Error((body && body.error) || `请求失败(${res.statusCode || ''})`));
        },
        fail(err) {
          const msg = err.errMsg || '';
          if (msg.includes('request:fail')) {
            tryNext(new Error('网络请求失败，请确认已勾选「不校验合法域名」'));
            return;
          }
          tryNext(new Error(msg || '网络错误'));
        },
      });
    };
    tryNext(new Error('网络错误'));
  });
}

function wechatLoginWithCode(code) {
  return request('/auth/wechat', { method: 'POST', data: { code } });
}

function devProbeLogin() {
  return request('/auth/dev-probe', {
    method: 'POST',
    data: { probeId: getProbeDeviceId() },
  });
}

function ensureLogin() {
  if (getToken()) return Promise.resolve({ token: getToken() });
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (loginRes) => {
        try {
          if (loginRes.code) {
            const res = await wechatLoginWithCode(loginRes.code);
            return resolve(saveAuthResponse(res));
          }
          throw new Error('微信登录失败');
        } catch (err) {
          if (!USE_DEV_LOGIN) return reject(err);
          try {
            const res = await devProbeLogin();
            resolve(saveAuthResponse(res));
          } catch (devErr) {
            reject(devErr);
          }
        }
      },
      fail: async () => {
        if (!USE_DEV_LOGIN) return reject(new Error('微信登录失败'));
        try {
          const res = await devProbeLogin();
          resolve(saveAuthResponse(res));
        } catch (devErr) {
          reject(devErr);
        }
      },
    });
  });
}

module.exports = {
  getFeatures: () => request('/config/features'),
  paipan: (body) => request('/paipan', { method: 'POST', data: body }),
  wechatLogin: wechatLoginWithCode,
  devProbeLogin,
  ensureLogin,
  generate: (body) => request('/generate', { method: 'POST', data: body, auth: true }),
  claimReport: (id) => request('/reports/' + id + '/claim', { method: 'POST', auth: true }),
  listReports: () => request('/reports', { auth: true }),
  getReport: (id) => request('/reports/' + id, { auth: true }),
  getToken,
  setToken(token) {
    wx.setStorageSync('token', token);
  },
  clearToken() {
    wx.removeStorageSync('token');
  },
};

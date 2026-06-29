#!/usr/bin/env node
/** 模拟探针全流程：本地排盘 → 离线生成报告 → 读取报告 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const require = createRequire(import.meta.url);

const store = {};
global.wx = {
  getStorageSync(k) {
    return store[k];
  },
  setStorageSync(k, v) {
    store[k] = v;
  },
};

const { computePaipan } = require(path.join(root, 'miniprogram/utils/paipan.js'));
const probeMock = require(path.join(root, 'miniprogram/utils/probeMock.js'));

const body = {
  name: '测试',
  gender: 'male',
  calendarType: 'solar',
  year: 1990,
  month: 1,
  day: 1,
  hour: 8,
  minute: 30,
  longitude: 120.15,
};

const paipan = computePaipan(body);
console.log('1. 排盘 OK:', paipan.baziString);

const login = probeMock.mockDevLogin();
console.log('2. 探针登录 OK:', !!login.data.token);

const gen = probeMock.mockGenerate({ ...body, baziString: paipan.baziString });
console.log('3. 生成报告 OK:', gen.data.reportId);

const report = probeMock.mockGetReport(gen.data.reportId);
console.log('4. 读取报告 OK:', report.data.content.includes('一、文化档案概览'));

console.log('\n全流程通过');

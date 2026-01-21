import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://rkqutqsdnlbuhgvondrh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrcXV0cXNkbmxidWhndm9uZHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzE0NDQsImV4cCI6MjA4MzAwNzQ0NH0._-Jn-WxsSwauwhxhg35Z1B3Im_VxAMSQ4YBvEic3QWM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type FortuneType = 'ziwei' | 'bazi' | 'tarot' | 'jiugong'
export type ProductType = 'main' | 'instant' | 'special'
export type SpecialType = 'love' | 'career' | 'health' | 'yearly'

export interface FortuneReport {
  id: string
  user_id: string
  fortune_type: FortuneType
  product_type: ProductType
  special_type?: SpecialType
  birth_date?: string
  birth_time?: string
  gender?: string
  birth_place?: string
  question?: string
  free_content?: string
  paid_content?: string
  is_paid: boolean
  price: number
  created_at: string
}

export interface UserProfile {
  id: string
  email?: string
  name?: string
  membership_type: 'free' | 'monthly' | 'quarterly' | 'yearly'
  membership_expires_at?: string
  daily_free_count: number
  daily_free_date?: string
}

export const fortuneTypeNames: Record<FortuneType, string> = {
  ziwei: '紫微斗数',
  bazi: '八字命理',
  tarot: '塔罗占卜',
  jiugong: '九宫命理'
}

export const productTypeNames: Record<ProductType, string> = {
  main: '完整报告',
  instant: '即时占卜',
  special: '专项报告'
}

export const specialTypeNames: Record<SpecialType, string> = {
  love: '感情姻缘',
  career: '事业财运',
  health: '健康养生',
  yearly: '流年运势'
}

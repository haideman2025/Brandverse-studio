

export interface Product {
  id: string;
  sku: string;
  product_name: string;
  product_short: string;
  benefits: string[];
  tech_specs: string;
  usp: string;
  productImage: UploadedFile | null;
  productInfoFile: UploadedFile | null;
  notes: string;
}

export type IdolPlatform = 'TikTok' | 'Facebook' | 'YouTube' | 'Instagram';

export interface VirtualIdol {
  id: string;
  name: string;
  username: string;
  avatar: UploadedFile | null;
  gender: TargetAudienceGender;
  ageRange: TargetAudienceAge;
  incomeLevel: IncomeLevel;
  archetype: string;
  platforms: IdolPlatform[];
  toneOfVoice: string;
  nicheMarkets: string;
  contentPillars: string;
  usp: string;
  isActive: boolean;
}


export interface BrandProfile {
  id: string;
  userId: string;
  name: string;
  colors: string[];
  logo: UploadedFile | null;
  guidelineFile: UploadedFile | null;
  products: Product[];
  virtualIdols: VirtualIdol[];
  outfits: UploadedFile[];
}

export interface Scene {
  id: string;
  name: string;
  description: string;
  lighting: string;
  defaultRatio: string;
}

export enum ImageType {
  PACKSHOT = 'PACKSHOT',
  LIFESTYLE = 'LIFESTYLE',
  INFOGRAPHIC = 'INFOGRAPHIC',
  BEFORE_AFTER = 'BEFORE_AFTER',
  UGC_SOCIAL = 'UGC_SOCIAL',
  MARKETPLACE_SET = 'MARKETPLACE_SET',
  BRANDFACE = 'BRANDFACE',
  VARIATIONS = 'VARIATIONS',
  STORYBOARD_FRAME = 'STORYBOARD_FRAME',
}

export interface UploadedFile {
  file?: File; 
  name: string;
  base64?: string;
  type: string;
  url?: string;
}

export type CameraShot = 'AUTO' | 'ELS' | 'LS' | 'MLS' | 'MS' | 'MCU' | 'ECU';
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type BrandStyle = 'POOL_PARTY' | 'BAR_PUB' | 'BATHROOM_MODERN' | 'GYM_LOCKER' | 'CAFÉ_WINDOW' | 'URBAN_ROOFTOP' | 'LIVING_SOFA' | 'DESK_MINIMAL' | 'OUTDOOR_PARK' | 'SHOWER_TILE' | 'STREET_NEON' | 'TET_HOLIDAY' | 'BEACH_SUNSET' | 'SIDEWALK_EATERY' | 'YOGA_RETREAT' | 'COCKTAIL_BAR' | 'AIRPORT_TERMINAL' | 'CLASSIC_LIBRARY' | 'MOUNTAIN_CAMPING' | 'ART_GALLERY' | 'GOLF_COURSE' | 'TET_FLOWER_MARKET' | 'REVIEW' | 'CUSTOM_PROMPT';
export type ImageFormat = 'Realistic' | 'Cartoon';

export type ViralAdFormula = 
  // Music Video
  'IDOL_CENTRIC_STORY' | 'LYRICAL_NARRATIVE' | 'VIBE_MONTAGE' | 'EMOTIONAL_JOURNEY' |
  // Brand Film
  'BRAND_ORIGIN_STORY' | 'CUSTOMER_TESTIMONIAL' | 'BEHIND_THE_SCENES' | 'PRODUCT_PHILOSOPHY' |
  // Social Media Story
  'UGC_CHALLENGE' | 'QUICK_TIP_TUTORIAL' | 'TRENDING_SOUND_MEME' | 'DAY_IN_THE_LIFE_TAKEOVER' |
  // Sales Video
  'PROBLEM_AGITATE_SOLVE' | 'UNBOXING_FIRST_IMPRESSION' | 'BEFORE_AFTER_TRANSFORMATION' | 'FEATURE_BENEFIT_DEMO';
export type TargetAudienceAge = '18-24' | '25-34' | '35-44' | '45+';
export type TargetAudienceGender = 'Male' | 'Female' | 'Any';

export type IncomeLevel = 'Low' | 'Medium' | 'High' | 'Affluent';
export type Lifestyle = 'Active & Outdoorsy' | 'Minimalist & Modern' | 'Luxury & Sophisticated' | 'Family-Oriented' | 'Tech-Savvy & Urban';
export type Location = 'Urban City' | 'Suburban' | 'Rural Countryside';

export type VoiceType = 'Male' | 'Female' | 'Duet';
export type MusicVibe = 'Romantic' | 'Powerful' | 'Fun' | 'Cinematic';
export type IdolRole = 'Singer' | 'Rapper' | 'Dancer' | 'Storyteller';

export interface CharacterAnalysis {
    gender: 'Male' | 'Female' | 'Other';
    ageRange: TargetAudienceAge;
    incomeLevel?: IncomeLevel;
    lifestyle?: Lifestyle;
    location?: Location;
    voiceType?: VoiceType;
    musicVibe?: MusicVibe;
    role?: IdolRole;
}

export type AdTextStyle = 'Minimalist' | 'Bold & Punchy' | 'Elegant Script' | 'Modern Sans-serif';
export type AdGoal = 'CONVERSION' | 'ENGAGEMENT' | 'AWARENESS';

export type PointOfView = 'FIRST_PERSON_I' | 'SECOND_PERSON_YOU' | 'THIRD_PERSON_HE_SHE' | 'BRAND_WE';

export type HumanizeTone = 'EVERYDAY_USER' | 'TEACHER' | 'ONLINE_REVIEWER' | 'BLOG_COMMENTER';
export interface AIDetectionResult {
  percentage: number;
  reasoning: string;
}


export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

// FIX: Added 'video' and 'video_script' to support video generation features.
export type ContentType = 'image' | 'audio' | 'ad' | 'blog' | 'video' | 'video_script';


interface BaseContent {
  id: string;
  userId: string;
  projectId: string;
  createdAt: string;
  name: string; 
}

export interface ImageContent extends BaseContent {
  type: 'image';
  url: string;
  prompt: string;
  settings: Record<string, any>;
}

export interface AudioContent extends BaseContent {
    type: 'audio';
    url: string; // data URI for the audio
    sourceText: string;
    language: 'vi-VN' | 'en-US';
    settings: Record<string, any>;
}

export const PLATFORM_NAMES = ['Facebook', 'Instagram', 'TikTok', 'Shopee'] as const;
export type PlatformName = typeof PLATFORM_NAMES[number];

export interface AdContent extends BaseContent {
  type: 'ad';
  baseImageUrl: string;
  headline: string;
  body: string;
  cta: string;
  settings: {
    adGoal: AdGoal;
    viralAdFormula: ViralAdFormula;
    // FIX: Renamed 'adInsights' to 'customerInsights' and added 'mainIdol' to match usage and resolve type errors.
    customerInsights: string;
    adTextStyle: AdTextStyle;
    textFont: string;
    targetAge: TargetAudienceAge;
    targetGender: TargetAudienceGender;
    brandId?: string;
    selectedProductId?: string;
    platform?: PlatformName;
    placementId?: string;
    baseAssetMimeType?: string;
    mainIdol?: { name: string; url?: string; type: string; } | null;
  };
}

export interface BlogSection {
  heading: string;
  paragraph: string;
  imageUrl?: string;
}

export type BlogLength = 'SHORT' | 'MEDIUM' | 'LONG';
export type BlogGoal = 'SEO_RANKING' | 'ENGAGEMENT' | 'LEAD_GENERATION' | 'PRODUCT_PROMOTION';

export interface BlogContent extends BaseContent {
  type: 'blog';
  title: string;
  featuredImageUrl?: string;
  sections: BlogSection[];
  settings: {
    topic: string;
    keywords: string[];
    brandId?: string;
    selectedProductId?: string;
    blogLength: BlogLength;
    blogGoal: BlogGoal;
    featuredAssetMimeType?: string;
    // FIX: Added 'mainIdol' and 'customerInsights' to match usage and resolve type errors.
    mainIdol?: { name: string; url?: string; type: string; } | null;
    customerInsights?: string;
  };
}

// FIX: Changed VideoDuration to string to allow dynamic values from audio files.
export type VideoDuration = string;
export type VideoUsageGoal = 'MUSIC_VIDEO_MV' | 'BRAND_FILM' | 'SOCIAL_MEDIA_STORY' | 'SALES_VIDEO';

export interface StoryboardFrame {
  scene: string;
  action: string;
  dialogue: string;
  transition: string;
  image_prompt: string;
  generated_image_url?: string;
}

export interface Storyboard {
  script_full: string;
  storyboard: StoryboardFrame[];
}

export interface StoryboardContent extends BaseContent {
  type: 'video_script';
  storyboard: Storyboard;
  settings: {
    videoDuration: VideoDuration;
    aspectRatio: AspectRatio;
    videoStyle: BrandStyle;
    targetAge: TargetAudienceAge[];
    targetGender: TargetAudienceGender;
    videoUsageGoal: VideoUsageGoal;
    viralAdFormula: ViralAdFormula;
    customContext: string;
  };
}

export interface VideoContent extends BaseContent {
  type: 'video';
  url: string;
  sourceStoryboardId: string;
  mimeType: string;
  settings: Record<string, any>;
}

export type ContentItem = ImageContent | AudioContent | AdContent | BlogContent | StoryboardContent | VideoContent;
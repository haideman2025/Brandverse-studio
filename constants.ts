

import { BrandProfile, Scene, CameraShot, BrandStyle, AspectRatio, ImageFormat, TargetAudienceAge, TargetAudienceGender, ViralAdFormula, AdGoal, BlogLength, BlogGoal, HumanizeTone, VideoUsageGoal } from './types';
import { TranslationKey } from './localization';

export const INITIAL_BRAND_PROFILES: BrandProfile[] = [
  {
    "id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "userId": "",
    "name": "ONIIZ",
    "colors": [
      "#7C3AED",
      "#22D3EE",
      "#22C55E"
    ],
    "logo": null,
    "guidelineFile": null,
    "products": [
      {
        "id": "prod-oniiz-1",
        "sku": "ONIIZ-MC-001",
        "product_name": "Oniiz Men’s Face Cleanser",
        "product_short": "Men’s Face Cleanser",
        "benefits": [
          "Deep pore cleansing",
          "Oil control",
          "Refreshing mint scent",
          "Non‑drying formula"
        ],
        "tech_specs": "150ml | PH 5.5 | Menthol light | Dermatologically tested",
        "usp": "Clean yet gentle daily wash designed for Vietnamese climate",
        "productImage": null,
        "productInfoFile": null,
        "notes": "Use brand tone 'Nam tính mới: sạch – tự tin – lịch lãm'"
      }
    ],
    "virtualIdols": [],
    "outfits": []
  }
];


export const SCENES_DATA_RAW = `scene_id,scene_name_vi,description_en,lighting_hint,default_ratio,difficulty
NEON_STAGE,Sân khấu Neon,"A dynamic stage bathed in vibrant neon and holographic lights. An idol performs for a virtual audience, with digital effects and light trails accentuating their movements. Perfect for a high-energy pop or EDM track.",vibrant neon + volumetric light,16:9,hard
URBAN_NIGHT_DRIVE,Lái xe đêm trong thành phố,"View from inside a futuristic car driving through a rain-slicked cyberpunk city at night. Towering skyscrapers with massive holographic ads reflect on the wet streets. The idol looks out the window, contemplative or singing.",city neon reflections + interior car light,16:9,hard
ROOFTOP_SUNSET,Hoàng hôn trên sân thượng,"An idol performs on a skyscraper rooftop as the sun sets over the city. The sky is a gradient of orange, pink, and purple. The mood is epic, emotional, and expansive.",golden hour + city glow,16:9,medium
ENCHANTED_FOREST,Khu rừng Mê hoặc,"A surreal, magical forest at twilight. Bioluminescent plants, glowing particles float in the air, and ancient trees create a mystical atmosphere. The idol interacts with the magical elements.",bioluminescent + moonlight,9:16,hard
INDUSTRIAL_DANCE,Vũ đạo trong nhà kho,"A gritty, industrial warehouse with concrete floors and exposed pipes. Powerful spotlights and smoke machines create a high-contrast, edgy dance performance scene.",hard spotlights + atmospheric smoke,16:9,medium
ART_GALLERY_AFTER_HOURS,Triển lãm nghệ thuật đêm,"A minimalist, modern art gallery after closing. The idol wanders among sculptures and paintings, which seem to come to life. The scene is sophisticated, mysterious, and creative.",focused gallery track lighting,4:5,medium
CLOUD_DREAMSCAPE,Cõi mộng trên mây,"A heavenly, dream-like set made of soft, glowing clouds. The idol floats or dances in a serene, ethereal environment. The color palette is soft pastels.",soft diffused daylight 5200K,1:1,easy
VIBRANT_STREET_STYLE,Phong cách đường phố Sôi động,"A bustling, fashionable street in a city like Seoul or Tokyo. The idol showcases street style, interacting with the vibrant environment, graffiti walls, and unique shops.",bright daylight + shop neons,9:16,hard
HIGH_FASHION_RUNWAY,Sàn diễn thời trang Cao cấp,"A high-fashion runway with dramatic lighting and an avant-garde backdrop. The idol walks the runway with confidence, showcasing a unique outfit. The vibe is powerful and chic.",dramatic runway spotlights,9:16,hard
RETRO_FUTURISM,Hoài cổ Tương lai,"A scene inspired by 80s/90s sci-fi aesthetics. CRT monitors, chrome details, and retro-tech create a nostalgic yet futuristic vibe. The idol interacts with old-school gadgets.",soft neon + CRT screen glow,4:3,medium
LUXURY_PENTHOUSE,Penthouse sang trọng,"A sleek, modern penthouse apartment with floor-to-ceiling windows overlooking a city at night. The idol enjoys a moment of quiet luxury, interacting with high-tech home features.",soft interior + city lights bokeh,16:9,medium
TRADITIONAL_GARDEN,Vườn Thiền An tĩnh,"A serene Japanese or Vietnamese traditional garden with a koi pond, stone lanterns, and meticulously raked sand. The idol is in a moment of peace and reflection, perhaps wearing a modern take on traditional attire.",soft, dappled sunlight,4:5,easy
`;

export const SCENES: Scene[] = SCENES_DATA_RAW.split('\n').slice(1).filter(row => row.trim()).map(row => {
    const parts = row.split(',');
    const id = parts[0];
    const fullDescription = parts.slice(2, parts.length - 3).join(',');
    return { id, name: parts[1], description: fullDescription.replace(/"/g, ''), lighting: parts[parts.length-3], defaultRatio: parts[parts.length-2] };
});

export const PROMPT_LIBRARY_RAW = `
## GLOBAL NEGATIVE (use for all image generations)
[NEGATIVE]
watermark, logo artifacts, distorted or melted labels, extra limbs/fingers, plastic-looking skin, oversaturated colors, unrealistic reflections, harsh HDR, text in frame (unless infographic), wrong brand logo, wrong language text, motion blur, jpeg artifacts, bad anatomy, mutated, deformed, harsh shadows

## 1) BRANDFACE (portrait + product)
[TEMPLATE:BRANDFACE]
CRITICAL: The final image's aspect ratio MUST be exactly {aspect_ratio}. You must generate a {aspect_ratio_description} image. For example, 9:16 is a tall vertical image, while 16:9 is a wide landscape image. Adhere strictly to the requested {aspect_ratio}. CRITICAL: Do not be influenced by the aspect ratios of any input reference images; the final output canvas MUST match the requested {aspect_ratio}.

Task: Generate a vibrant lifestyle advertisement featuring a person and a product in a specified scene. The image's art style must strictly be **{image_format}**. The final result must embody four key values: visual appeal, unique information, expert knowledge, and emotional connection.

**Core Elements (Value: Unique Information & Expert Knowledge):**
- **Person(s):** The primary person (Idol) must accurately match the identity, facial structure, and skin tone from {idol_ref}, wearing an outfit inspired by {outfit_ref}. If a supporting person is requested via {supporting_idol_ref}, they must also be accurately represented. The pose and interaction between characters (if applicable) must be confident, approachable, and natural.
- **Product:** Feature the {product_short} prominently but naturally within the scene. Preserve its geometry and label exactly as shown in the {product_ref}. The product's placement should feel organic to the environment.
- **Scene:** Create a detailed, immersive {style_name} environment based on this description: "{style_desc}". The atmosphere must be engaging and perfectly align with the brand's tone and the intended emotion.

**Art Direction (Value: Visual Appeal & Emotional Connection):**
- **Camera Shot:** Use a {camera_shot} to frame the subject and product, telling a clear story. Employ a subtle, realistic depth of field to draw the viewer's focus to the key elements.
- **Lighting:** The lighting is critical. It must be {lighting}. Ensure it is flattering on the person, creating realistic skin tones and textures (including pores). It should also highlight the product's form and material. No plastic skin or over-retouching.
- **Composition & Style:** The overall style is {brand_tone}, modern, and authentic. The composition must be clean, using only relevant props that enhance the narrative. The mood should be {keywords} to forge a strong emotional connection with the viewer.
- **Color Palette:** The scene's colors must be cohesive and aesthetically pleasing, subtly inspired by the brand colors: {brand_colors}.

**Output Specifications:**
- **Resolution:** High-resolution, suitable for professional digital advertising (e.g., 2048px on the long edge).
- **Format:** JPG (92% quality for realism).

**Crucial Negative Prompt:**
[NEGATIVE]

## 3) STORYBOARD_FRAME (frame + context)
[TEMPLATE:STORYBOARD_FRAME]
CRITICAL: The final image's aspect ratio MUST be exactly {aspect_ratio}. You must generate a {aspect_ratio_description} image. For example, 9:16 is a tall vertical image, while 16:9 is a wide landscape image. Adhere strictly to the requested {aspect_ratio}. CRITICAL: Do not be influenced by the aspect ratios of any input reference images; the final output canvas MUST match the requested {aspect_ratio}.

Task: Generate a single, cinematic video frame for a storyboard. The image's art style must strictly be **{image_format}**.

**Core Elements:**
- **Person(s):** The primary person (Idol) must accurately match the identity from {idol_ref}, wearing an outfit inspired by {outfit_ref}. If a supporting person is requested via {supporting_idol_ref}, they must also be accurately represented.
- **Product:** Feature the {product_short} prominently but naturally, preserving its appearance from {product_ref}.
- **Scene & Action:** The main focus is the specific action in this frame. Render this description with high fidelity: "{frame_description}". This overrides the general scene description if there's a conflict.
- **Overall Context:** The general scene is a {style_name} environment: "{style_desc}". The atmosphere must be engaging and align with the brand's tone.

**Art Direction:**
- **Lighting:** The lighting is critical. It must be {lighting}. Ensure it is flattering on the person and product.
- **Composition & Style:** The overall style is {brand_tone}.
- **Color Palette:** The scene's colors must be cohesive, subtly inspired by the brand colors: {brand_colors}.

**Crucial Negative Prompt:**
[NEGATIVE]
`;

// FIX: Corrected TranslationKey types for nameKey property.
export const BRAND_STYLE_OPTIONS: { id: BrandStyle, nameKey: TranslationKey }[] = [
  ...SCENES.map(s => ({ id: s.id as BrandStyle, nameKey: `style_${s.id.toLowerCase()}` as TranslationKey })),
  { id: 'CUSTOM_PROMPT', nameKey: 'style_custom_prompt' },
];

// FIX: Corrected TranslationKey types for nameKey property.
export const CAMERA_SHOTS: { id: CameraShot, nameKey: TranslationKey }[] = [
    { id: 'AUTO', nameKey: 'shot_auto' },
    { id: 'ELS', nameKey: 'shot_els' },
    { id: 'LS', nameKey: 'shot_ls' },
    { id: 'MLS', nameKey: 'shot_mls' },
    { id: 'MS', nameKey: 'shot_ms' },
    { id: 'MCU', nameKey: 'shot_mcu' },
    { id: 'ECU', nameKey: 'shot_ecu' }
];

// FIX: Corrected TranslationKey types for nameKey property.
export const ASPECT_RATIOS: { id: AspectRatio, nameKey: TranslationKey }[] = [
    { id: '16:9', nameKey: 'aspect_ratio_16_9' },
    { id: '9:16', nameKey: 'aspect_ratio_9_16' },
    { id: '1:1', nameKey: 'aspect_ratio_1_1' },
];

export const IMAGE_FORMATS: { id: ImageFormat, name: string }[] = [
    { id: 'Realistic', name: 'Realistic' },
    { id: 'Cartoon', name: 'Cartoon' },
];

export const BRAND_FONTS: { id: string, name: string, type: 'Sans-serif' | 'Serif' | 'Script', family: string }[] = [
    { id: 'Montserrat', name: 'Montserrat', type: 'Sans-serif', family: 'Montserrat, sans-serif' },
    { id: 'Oswald', name: 'Oswald', type: 'Sans-serif', family: 'Oswald, sans-serif' },
    { id: 'Playfair Display', name: 'Playfair Display', type: 'Serif', family: '"Playfair Display", serif' },
    { id: 'Lora', name: 'Lora', type: 'Serif', family: 'Lora, serif' },
    { id: 'Dancing Script', name: 'Dancing Script', type: 'Script', family: '"Dancing Script", cursive' },
    { id: 'Pacifico', name: 'Pacifico', type: 'Script', family: 'Pacifico, cursive' },
    { id: 'Inter', name: 'Inter (UI Font)', type: 'Sans-serif', family: 'Inter, sans-serif' }
];

export const QC_CHECKLIST_VN: string[] = [
    "Nhãn & chữ trên bao bì rõ, không méo, không gãy nét.",
    "Ánh sáng tự nhiên, không quá bệt, không HDR gắt.",
    "Tỉ lệ sản phẩm đúng với bối cảnh; không 'khổng lồ' hay quá nhỏ.",
    "Da người (nếu có) không nhựa, không thừa ngón; màu da tự nhiên.",
    "Màu thương hiệu/brand tone đồng nhất; không lạm dụng filter.",
    "Nền sạch, không rác ảnh, không watermark/artifacts.",
    "Infographic: mỗi ý benefit ≤ 8 chữ; font chữ đọc được trên mobile.",
    "Before–After: cùng góc/sáng; thêm disclaimer.",
    "Xuất file đủ các size 1:1, 4:5, 9:16 khi cần; file size tối ưu.",
    "Lưu metadata (prompt + seed + settings) để tái tạo khi cần."
];

export const TARGET_AUDIENCE_AGES: { id: TargetAudienceAge, name: string }[] = [
    { id: '18-24', name: '18-24' },
    { id: '25-34', name: '25-34' },
    { id: '35-44', name: '35-44' },
    { id: '45+', name: '45+' }
];

// FIX: Corrected TranslationKey types for nameKey property.
export const TARGET_AUDIENCE_GENDERS: { id: TargetAudienceGender, nameKey: TranslationKey }[] = [
    { id: 'Male', nameKey: 'gender_male' },
    { id: 'Female', nameKey: 'gender_female' },
    { id: 'Any', nameKey: 'gender_any' }
];

export const CONTEXTUAL_VIRAL_FORMULAS: Record<VideoUsageGoal, { id: ViralAdFormula, nameKey: TranslationKey, descriptionKey: TranslationKey }[]> = {
    'MUSIC_VIDEO_MV': [
        { id: 'IDOL_CENTRIC_STORY', nameKey: 'viral_formula_idol_centric_name', descriptionKey: 'viral_formula_idol_centric_desc' },
        { id: 'LYRICAL_NARRATIVE', nameKey: 'viral_formula_lyrical_narrative_name', descriptionKey: 'viral_formula_lyrical_narrative_desc' },
        { id: 'VIBE_MONTAGE', nameKey: 'viral_formula_vibe_montage_name', descriptionKey: 'viral_formula_vibe_montage_desc' },
        { id: 'EMOTIONAL_JOURNEY', nameKey: 'viral_formula_emotional_journey_name', descriptionKey: 'viral_formula_emotional_journey_desc' }
    ],
    'BRAND_FILM': [
        { id: 'BRAND_ORIGIN_STORY', nameKey: 'viral_formula_brand_origin_story_name', descriptionKey: 'viral_formula_brand_origin_story_desc' },
        { id: 'CUSTOMER_TESTIMONIAL', nameKey: 'viral_formula_customer_testimonial_name', descriptionKey: 'viral_formula_customer_testimonial_desc' },
        { id: 'BEHIND_THE_SCENES', nameKey: 'viral_formula_behind_the_scenes_name', descriptionKey: 'viral_formula_behind_the_scenes_desc' },
        { id: 'PRODUCT_PHILOSOPHY', nameKey: 'viral_formula_product_philosophy_name', descriptionKey: 'viral_formula_product_philosophy_desc' }
    ],
    'SOCIAL_MEDIA_STORY': [
        { id: 'UGC_CHALLENGE', nameKey: 'viral_formula_ugc_challenge_name', descriptionKey: 'viral_formula_ugc_challenge_desc' },
        { id: 'QUICK_TIP_TUTORIAL', nameKey: 'viral_formula_quick_tip_tutorial_name', descriptionKey: 'viral_formula_quick_tip_tutorial_desc' },
        { id: 'TRENDING_SOUND_MEME', nameKey: 'viral_formula_trending_sound_meme_name', descriptionKey: 'viral_formula_trending_sound_meme_desc' },
        { id: 'DAY_IN_THE_LIFE_TAKEOVER', nameKey: 'viral_formula_day_in_the_life_takeover_name', descriptionKey: 'viral_formula_day_in_the_life_takeover_desc' }
    ],
    'SALES_VIDEO': [
        { id: 'PROBLEM_AGITATE_SOLVE', nameKey: 'viral_formula_problem_agitate_solve_name', descriptionKey: 'viral_formula_problem_agitate_solve_desc' },
        { id: 'UNBOXING_FIRST_IMPRESSION', nameKey: 'viral_formula_unboxing_first_impression_name', descriptionKey: 'viral_formula_unboxing_first_impression_desc' },
        { id: 'BEFORE_AFTER_TRANSFORMATION', nameKey: 'viral_formula_before_after_transformation_name', descriptionKey: 'viral_formula_before_after_transformation_desc' },
        { id: 'FEATURE_BENEFIT_DEMO', nameKey: 'viral_formula_feature_benefit_demo_name', descriptionKey: 'viral_formula_feature_benefit_demo_desc' }
    ]
};

// FIX: Corrected TranslationKey types for nameKey and descriptionKey properties.
export const AD_GOALS: { id: AdGoal, nameKey: TranslationKey, descriptionKey: TranslationKey }[] = [
    { id: 'CONVERSION', nameKey: 'ad_goal_conversion_name', descriptionKey: 'ad_goal_conversion_desc' },
    { id: 'ENGAGEMENT', nameKey: 'ad_goal_engagement_name', descriptionKey: 'ad_goal_engagement_desc' },
    { id: 'AWARENESS', nameKey: 'ad_goal_awareness_name', descriptionKey: 'ad_goal_awareness_desc' }
];

// FIX: Corrected TranslationKey types for nameKey property.
export const BLOG_LENGTHS: { id: BlogLength, nameKey: TranslationKey }[] = [
    { id: 'SHORT', nameKey: 'blog_length_short' },
    { id: 'MEDIUM', nameKey: 'blog_length_medium' },
    { id: 'LONG', nameKey: 'blog_length_long' }
];

// FIX: Corrected TranslationKey types for nameKey property.
export const BLOG_GOALS: { id: BlogGoal, nameKey: TranslationKey }[] = [
    { id: 'SEO_RANKING', nameKey: 'blog_goal_seo' },
    { id: 'ENGAGEMENT', nameKey: 'blog_goal_engagement' },
    { id: 'LEAD_GENERATION', nameKey: 'blog_goal_leadgen' },
    { id: 'PRODUCT_PROMOTION', nameKey: 'blog_goal_product' }
];

// FIX: Corrected TranslationKey types for nameKey property.
export const HUMANIZE_TONE_OPTIONS: { id: HumanizeTone, nameKey: TranslationKey }[] = [
    { id: 'EVERYDAY_USER', nameKey: 'humanize_everyday_user' },
    { id: 'TEACHER', nameKey: 'humanize_teacher' },
    { id: 'ONLINE_REVIEWER', nameKey: 'humanize_online_reviewer' },
    { id: 'BLOG_COMMENTER', nameKey: 'humanize_blog_commenter' },
];

// FIX: Added VIDEO_USAGE_GOALS constant for video generation features.
export const VIDEO_USAGE_GOALS: { id: VideoUsageGoal, nameKey: TranslationKey, descriptionKey: TranslationKey }[] = [
    { id: 'MUSIC_VIDEO_MV', nameKey: 'video_goal_mv_name', descriptionKey: 'video_goal_mv_desc' },
    { id: 'BRAND_FILM', nameKey: 'video_goal_brand_film_name', descriptionKey: 'video_goal_brand_film_desc' },
    { id: 'SOCIAL_MEDIA_STORY', nameKey: 'video_goal_social_story_name', descriptionKey: 'video_goal_social_story_desc' },
    { id: 'SALES_VIDEO', nameKey: 'video_goal_sales_video_name', descriptionKey: 'video_goal_sales_video_desc' },
];


export const AD_COPY_PROMPT_TEMPLATE = `
You are an expert Vietnamese copywriter specializing in direct-response ads for e-commerce. Generate an array of 3 distinct ad copy options in JSON format.

**CRITICAL RULES:**
1.  **LANGUAGE:** All copy (headline, body, cta) MUST be in **VIETNAMESE**.
2.  **FORMAT:** The output MUST be a single, valid JSON array. Each object in the array must contain "headline", "body", and "cta".

**PRODUCT & CAMPAIGN INFO:**
-   **Product Name:** {product_name}
-   **Key Benefits:** {benefits}
-   **Unique Selling Proposition (USP):** {usp}
-   **Brand Tone:** {brand_tone}
-   **Ad Goal:** {ad_goal}
-   **Viral Ad Formula:** {ad_formula}
-   **Target Audience:** {audience}
-   **Consumer Insights:** {insights}

Now, generate the JSON array with 3 ad copy variations.
`;

export const BLOG_POST_PROMPT_TEMPLATE = `
You are an expert Vietnamese content writer, skilled in creating engaging, SEO-friendly blog posts for e-commerce brands. Generate a complete blog post as a single JSON object.

**CRITICAL RULES:**
1.  **LANGUAGE:** All content (title, headings, paragraphs) MUST be in **VIETNAMESE**.
2.  **FORMAT:** The output MUST be a single, valid JSON object.
3.  **STRUCTURE:** The JSON must have a "title" (string) and "sections" (array of objects, each with "heading" and "paragraph").

**CONTENT BRIEF:**
-   **Main Topic:** {topic}
-   **Keywords:** {keywords}
-   **Product to Feature:** {product_name}
-   **Product Benefits to Weave In:** {benefits}
-   **Brand Tone:** {brand_tone}
-   **Blog Length:** {blog_length}
-   **Blog Goal:** {blog_goal}

Now, generate the complete blog post as a JSON object.
`;

export const BLOG_IDEAS_PROMPT_TEMPLATE = `
You are a brilliant Vietnamese content strategist for e-commerce brands. Based on the product and audience, generate an array of 5 distinct blog post ideas in JSON format.

**CRITICAL RULES:**
1.  **LANGUAGE:** The topic and keywords MUST be in **VIETNAMESE**.
2.  **FORMAT:** The output MUST be a single, valid JSON array. Each object must contain "topic" and "keywords".

**PRODUCT & AUDIENCE INFO:**
-   **Product Name:** {product_name}
-   **Key Benefits:** {benefits}
-   **Brand Tone:** {brand_tone}
-   **Viral Ad Formula:** {ad_formula}
-   **Target Audience:** {audience}
-   **Consumer Insights:** {insights}

Now, generate the JSON array with 5 blog ideas.
`;

export const CONTEXT_SUGGESTION_PROMPT_TEMPLATE = `
You are an AI creative assistant for e-commerce. Based on the product, character profile, and key insight, suggest a JSON array of 5-7 creative, specific, and compelling contexts (scenes or settings) for a photoshoot or video.

**CRITICAL RULES:**
1.  **LANGUAGE:** The suggestions MUST be in **VIETNAMESE**.
2.  **FORMAT:** The output must be a single, valid JSON array of strings.
3.  **TONE:** The suggestions should be concise and evocative (e.g., "Quán cà phê sân vườn buổi sáng", "Sân thượng lộng gió lúc hoàng hôn").

**INPUT DATA:**
-   **Product:** {product_name} ({benefits})
-   **Character Profile:**
    -   Gender: {gender}
    -   Age: {age_range}
    -   Lifestyle: {lifestyle}
    -   Income: {income}
    -   Location: {location}
-   **Key Insight:** {insights}

Now, generate the JSON array of context suggestions.
`;

export const AI_DETECTION_PROMPT_TEMPLATE = `
As an AI Content Analyzer, your task is to evaluate the provided text and determine the probability that it was written by an AI. Provide your analysis in a specific JSON format.

**CRITICAL RULES:**
1.  **Analyze Holistically:** Consider factors like word choice (e.g., overuse of words like "delve," "leverage," "tapestry"), sentence structure (e.g., uniform length and complexity), unnatural flow, excessive complexity, and lack of personal voice or anecdotes.
2.  **Provide a Percentage:** Give a numerical percentage from 0 (definitely human) to 100 (definitely AI).
3.  **Provide Reasoning:** Briefly explain your reasoning in 1-2 sentences in VIETNAMESE.
4.  **FORMAT:** The output MUST be a single, valid JSON object with two keys: "percentage" (integer) and "reasoning" (string).

**TEXT TO ANALYZE:**
<<<TEXT_TO_ANALYZE>>>

Now, provide your analysis in the specified JSON format.
`;

export const HUMANIZE_CONTENT_PROMPT_TEMPLATE = `
As an expert VIETNAMESE copy editor, your task is to rewrite the following text to make it sound more human and natural, eliminating any robotic, overly formal, or generic AI-like language.

**CRITICAL RULES:**
1.  **Preserve Core Message:** Do not change the fundamental meaning or key information of the original text.
2.  **Adopt the Persona:** Rewrite the text from the perspective of a **{tone}**. {custom_persona_instruction}
3.  **Point of View:** The final writing style MUST consistently use the **{point_of_view}**.
4.  **Improve Flow & Readability:** Use varied sentence structures, simpler, more common vocabulary, and a personal, conversational touch.
5.  **LANGUAGE:** The output MUST be in **VIETNAMESE**.
6.  **Output:** Provide ONLY the rewritten text, without any introductory phrases like "Here is the rewritten text:".

**ORIGINAL TEXT:**
<<<ORIGINAL_TEXT>>>

Now, rewrite the text based on all the rules above.
`;

export const HUMANIZE_AD_COPY_PROMPT_TEMPLATE = `
As an expert VIETNAMESE copy editor, your task is to rewrite the following ad copy to make it sound more human and natural, while respecting the ad format. The ad consists of a headline and a body, separated by a double newline.

**CRITICAL RULES:**
1.  **Preserve Core Message:** Do not change the fundamental meaning or key information of the original text.
2.  **Maintain Structure:** Your output MUST strictly follow the "HEADLINE\n\nBODY" format. There must be exactly one double newline between the headline and the body.
3.  **Headline Constraint:** The rewritten headline MUST be a single, short, impactful sentence, ideally under 15 words. It MUST NOT contain any newlines.
4.  **Adopt the Persona:** Rewrite the text from the perspective of a **{tone}**. {custom_persona_instruction}
5.  **Point of View:** The final writing style MUST consistently use the **{point_of_view}**.
6.  **LANGUAGE:** The output MUST be in **VIETNAMESE**.
7.  **Output:** Provide ONLY the rewritten text in the specified structure, without any introductory phrases.

**ORIGINAL AD COPY:**
<<<ORIGINAL_TEXT>>>

Now, rewrite the ad copy based on all the rules above.
`;

export const HUMANIZE_SUGGESTIONS_PROMPT_TEMPLATE = `
You are an expert VIETNAMESE copy editor and creative strategist. A piece of text has been analyzed and found to be potentially AI-generated. Your task is to rewrite it in 3 distinct, more human-sounding variations.

**CRITICAL RULES:**
1.  **LANGUAGE:** All output MUST be in **VIETNAMESE**.
2.  **FORMAT:** The output MUST be a single, valid JSON array. Each object in the array must contain "title" (a short name for the style, e.g., "Thân thiện & Gần gũi") and "content" (the rewritten text).
3.  **Preserve Core Message:** Do not change the fundamental meaning or key information of the original text.
4.  **Use Context:** Leverage the provided context to make the suggestions relevant and compelling.

**ANALYSIS OF ORIGINAL TEXT:**
-   **AI Probability Score:** {ai_score}%
-   **Reasoning:** {ai_reasoning}

**ORIGINAL TEXT:**
<<<ORIGINAL_TEXT>>>

**BROADER CAMPAIGN CONTEXT:**
-   **Product:** {product_name} ({benefits})
-   **Target Audience / Character Profile:** {character_desc}
-   **Key Insight:** {insights}
-   **Context/Scene:** {context}

Now, generate the JSON array with 3 distinct humanized variations based on all the rules and context above.
`;


export const STORYBOARD_PROMPT_TEMPLATE = `
You are an expert VIETNAMESE creative director and scriptwriter for e-commerce video ads. Your task is to generate a complete video storyboard in a valid JSON format. Think like a director creating a viral short film, not a simple product ad. The story should be compelling and cohesive, with a clear beginning, middle, and end.

**CRITICAL RULES:**
1.  **LANGUAGE:** All output fields (script_full, scene, action, dialogue, etc.) MUST be in **{language}**.
2.  **FORMAT:** The output MUST be a single, valid JSON object matching the provided schema.
3.  **FRAME COUNT:** Generate exactly **{frame_count}** frames for the storyboard array. This is based on a {video_duration} video with 3 seconds per frame.
4.  **IMAGE PROMPT DETAIL & SHOT VARIETY:** Each "image_prompt" must be a highly detailed, descriptive paragraph in ENGLISH, ready for an image generation AI. It must describe the camera shot, lighting, character actions, expressions, product placement, and background elements. **CRUCIAL: Use a variety of cinematic shots.** Include establishing shots to set the scene, wide shots for context, and medium/close-up shots for emotion and detail. **Do not focus only on the character.** The environment and atmosphere are just as important.
5.  **SUBTLE PRODUCT PLACEMENT:** The product should appear naturally and subtly within the story. **Do not force it into every frame.** Aim for the product to be visible in approximately 25-30% of the key scenes, focusing on moments where it enhances the narrative rather than interrupts it. The goal is an authentic, engaging story, not a hard-sell commercial.

**CAMPAIGN BRIEF:**
-   **Product:** {product_name}
-   **Key Benefits:** {benefits}
-   **Brand Tone:** {brand_tone}
-   **Video Duration:** {video_duration}
-   **Aspect Ratio:** {aspect_ratio}
-   **Target Audience:** {audience}
-   **Core Customer Insight:** {insights}
-   **Main Goal:** {usage_goal}
-   **Viral Formula:** {ad_formula}
-   **Key Scene/Context:** {context}
-   **Main Character:** {character_desc}
-   **Supporting Character:** {supporting_character_desc}
-   **Music Vibe:** {music_vibe}
-   **Provided Lyrics:** {lyrics}

Now, generate the complete storyboard JSON.
`;

export const REGENERATE_FRAMES_PROMPT_TEMPLATE = `
You are an expert VIETNAMESE creative director. Your task is to break down the following video script into a series of storyboard frames.

**CRITICAL RULES:**
1.  **LANGUAGE:** All output fields (scene, action, dialogue, etc.) MUST be in **{language}**, except for "image_prompt" which MUST be in ENGLISH.
2.  **FORMAT:** The output MUST be a single, valid JSON array of frame objects.
3.  **FRAME COUNT:** The number of frames should naturally correspond to the scenes and actions described in the script, aiming for roughly **{frame_count}** frames.
4.  **IMAGE PROMPT DETAIL:** Each "image_prompt" must be a highly detailed, descriptive paragraph in ENGLISH, ready for an image generation AI. It must describe the camera shot, lighting, character actions, expressions, product placement, and background elements based on the script and original context.

**VIDEO SCRIPT TO PROCESS:**
---
{script}
---

**ORIGINAL CAMPAIGN CONTEXT (for visual consistency):**
-   **Product:** {product_name}
-   **Brand Tone:** {brand_tone}
-   **Aspect Ratio:** {aspect_ratio}
-   **Target Audience:** {audience}
-   **Key Scene/Context:** {context}
-   **Main Character:** {character_desc}
-   **Supporting Character:** {supporting_character_desc}

Now, generate the JSON array of storyboard frames based on the script.
`;

export const YOUTUBE_ANALYSIS_PROMPT_TEMPLATE = `
You are a world-class film and music video analyst. Your task is to analyze the content of the provided YouTube URL and extract its core creative elements.

**URL to Analyze:** {youtube_url}

**Instructions:**
1.  Provide a concise, one-paragraph summary of the video's main narrative or concept.
2.  List the key scenes in chronological order. For each scene, briefly describe the setting, character actions, and dominant mood.
3.  Describe the overall visual style (e.g., cinematic, gritty, retro, futuristic, color palette).
4.  Describe the emotional arc of the video (e.g., from sad to hopeful, building tension, celebratory).
5.  If available and relevant, extract the key lyrics that drive the story.

Provide a comprehensive analysis focusing on storytelling and visual elements.
`;

export const STORYBOARD_FROM_INSPIRATION_PROMPT_TEMPLATE = `
You are an expert VIETNAMESE creative director and scriptwriter for e-commerce video ads. Your task is to generate a complete video storyboard in a valid JSON format, heavily inspired by the provided source material analysis.

**CRITICAL RULES:**
1.  **LANGUAGE:** All output fields (script_full, scene, action, dialogue, etc.) MUST be in **{language}**, except for "image_prompt" which MUST be in ENGLISH.
2.  **FORMAT:** The output MUST be a single, valid JSON object matching the provided schema.
3.  **FRAME COUNT:** Generate exactly **{frame_count}** frames.
4.  **ADAPTATION:** Do NOT simply copy the source. Intelligently adapt the core concept, scenes, and emotional arc of the inspiration to create a NEW story that features the specified product. The product should be integrated naturally.

**INSPIRATION ANALYSIS (Source Material):**
---
{inspiration_analysis}
---

**NEW CAMPAIGN BRIEF:**
-   **Product:** {product_name}
-   **Key Benefits:** {benefits}
-   **Brand Tone:** {brand_tone}
-   **Video Duration:** {video_duration}
-   **Aspect Ratio:** {aspect_ratio}
-   **Main Character:** {character_desc}
-   **Supporting Character:** {supporting_character_desc}

Now, generate the complete storyboard JSON, adapting the inspiration to the new campaign brief.
`;
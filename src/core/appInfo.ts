// 应用基础信息
// 统一提供版本号等元数据，避免在各处重复解析 package.json

import pkg from '../../package.json'

export const APP_VERSION: string = (pkg as any)?.version ?? '0.0.0'


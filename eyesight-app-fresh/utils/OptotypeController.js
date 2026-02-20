// 視標渲染與角度控制模組
// 確保視標視角大小與距離無關

export class OptotypeController {
  constructor(ppi) {
    this.ppi = ppi || 401; // iPhone 預設 PPI
    this.targetAngleArcmin = null;
  }

  /**
   * 設定目標視角
   * @param {number} logMAR - logMAR 值
   */
  setTargetLogMAR(logMAR) {
    // logMAR = log10(α / α_ref)
    // α_ref = 5 arcmin (20/20 視力)
    const alphaRef = 5; // arcmin
    const alpha = alphaRef * Math.pow(10, logMAR);
    this.targetAngleArcmin = alpha;
  }

  /**
   * 計算視標物理高度
   * @param {number} distance - 距離 (cm)
   * @returns {number} 高度 (cm)
   */
  calculatePhysicalHeight(distance) {
    if (!this.targetAngleArcmin) {
      console.warn('[OptotypeController] Target angle not set');
      return null;
    }

    // 轉換 arcmin 到 radians
    const angleRad = (this.targetAngleArcmin / 60) * (Math.PI / 180);
    
    // H = α * d (小角度近似: tan(α) ≈ α)
    const height = angleRad * distance;
    
    return height;
  }

  /**
   * 計算視標像素高度
   * @param {number} distance - 距離 (cm)
   * @returns {number} 像素高度
   */
  calculatePixelHeight(distance) {
    const heightCm = this.calculatePhysicalHeight(distance);
    
    if (!heightCm) return null;

    // 轉換為英吋
    const heightInch = heightCm / 2.54;
    
    // 計算像素: H_px = H_inch * PPI
    const heightPx = heightInch * this.ppi;
    
    return Math.round(heightPx);
  }

  /**
   * 獲取 Landolt C 參數
   * @param {number} distance - 距離 (cm)
   * @returns {Object} {size, gap, stroke}
   */
  getLandoltCParams(distance) {
    const totalHeight = this.calculatePixelHeight(distance);
    
    if (!totalHeight) return null;

    // Landolt C 標準比例
    // 總高度 = 5 單位
    // 缺口寬度 = 1 單位
    // 筆畫寬度 = 1 單位
    const unit = totalHeight / 5;
    
    return {
      size: totalHeight,
      gap: unit,
      stroke: unit,
      radius: totalHeight / 2
    };
  }

  /**
   * 計算當前視角
   * @param {number} pixelHeight - 像素高度
   * @param {number} distance - 距離 (cm)
   * @returns {number} 視角 (arcmin)
   */
  calculateCurrentAngle(pixelHeight, distance) {
    // 像素轉物理高度
    const heightInch = pixelHeight / this.ppi;
    const heightCm = heightInch * 2.54;
    
    // 計算視角
    const angleRad = heightCm / distance;
    const angleDeg = angleRad * (180 / Math.PI);
    const angleArcmin = angleDeg * 60;
    
    return angleArcmin;
  }

  /**
   * logMAR 到 Snellen 轉換
   * @param {number} logMAR
   * @returns {string} Snellen 表示 (如 "20/20")
   */
  logMARToSnellen(logMAR) {
    const denominator = 20 * Math.pow(10, logMAR);
    return `20/${Math.round(denominator)}`;
  }
}
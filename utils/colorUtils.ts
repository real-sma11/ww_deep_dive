/**
 * Utility functions for generating colors and materials based on hierarchical depth.
 */

// Convert hex color to HSL (Hue, Saturation, Lightness)
function hexToHsl(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [h * 360, s * 100, l * 100]
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s))
  l = Math.max(0, Math.min(100, l))

  h /= 360
  s /= 100
  l /= 100

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16)
    return hex.length === 1 ? "0" + hex : hex
  }

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Generates node color and material properties based on a monochromatic, generational cycle.
 * @param primaryColor - The primary hex color for the family.
 * @param level - The generation level of the node.
 * @returns An object with color, glowColor, metalness, and roughness.
 */
function generateMonochromaticMaterials(
  primaryColor: string,
  level: number,
): { color: string; glowColor: string; metalness: number; roughness: number } {
  // Hub (level 0) gets its own special properties
  if (level === 0) {
    return {
      color: primaryColor,
      glowColor: hslToHex(...hexToHsl(primaryColor)),
      metalness: 0.8,
      roughness: 0.2,
    }
  }

  const [h, s, l] = hexToHsl(primaryColor)

  // Orb color gets lighter with each generation
  const nodeColor = hslToHex(h, s, Math.min(l + (level - 1) * 8, 85))

  // Glow color also gets lighter, but more dramatically
  const glowColor = hslToHex(h, s, Math.min(l + (level - 1) * 12, 90))

  // Material properties cycle through 3 stages
  const materialStage = (level - 1) % 3
  let metalness, roughness

  switch (materialStage) {
    case 0: // Level 1, 4, 7... (Polished Metal)
      metalness = 0.9
      roughness = 0.15
      break
    case 1: // Level 2, 5, 8... (Satin Finish)
      metalness = 0.5
      roughness = 0.4
      break
    case 2: // Level 3, 6, 9... (Matte Finish)
    default:
      metalness = 0.1
      roughness = 0.75
      break
  }

  return {
    color: nodeColor,
    glowColor,
    metalness,
    roughness,
  }
}

/**
 * Apply monochromatic material properties to a node tree.
 * @param node - The node to process.
 * @param primaryColor - The primary color for this family.
 * @param level - Current generation level.
 */
export function applyMonochromaticMaterials(node: any, primaryColor: string, level = 0): void {
  const materials = generateMonochromaticMaterials(primaryColor, level)

  node.color = materials.color
  node.glowColor = materials.glowColor
  node.metalness = materials.metalness
  node.roughness = materials.roughness

  if (node.children) {
    node.children.forEach((child: any) => {
      applyMonochromaticMaterials(child, primaryColor, level + 1)
    })
  }
}

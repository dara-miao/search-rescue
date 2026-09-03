import type { SiteData } from '../data/site'

export const CLIMB_M: number

export function worldToLocal(x: number, z: number, siteData: SiteData): { x: number; z: number }
export function localToWorld(lx: number, lz: number, siteData: SiteData): { x: number; z: number }
export function lawnNoise(x: number, z: number): number
export function defaultPaths(
  centre: { x: number; z: number },
  D: number,
  staging: { x: number; z: number },
): Array<{ width: number; points: Array<[number, number]> }>
export function trousdaleRibbon(siteData: SiteData): {
  name: string
  width: number
  localX: number
  localZ0: number
  localZ1: number
  points: Array<[number, number]>
}
export function heightAt(
  x: number,
  z: number,
  siteData: SiteData,
  opts?: { staging?: { x: number; z: number }; paths?: Array<{ width: number; points: Array<[number, number]> }> },
): number
export function normalAt(
  x: number,
  z: number,
  siteData: SiteData,
  opts?: { staging?: { x: number; z: number } },
): { x: number; y: number; z: number }
export function chassisAttitude(
  x: number,
  z: number,
  yaw: number,
  siteData: SiteData,
  opts?: { staging?: { x: number; z: number } },
): { pitch: number; roll: number }
export function followGround(
  curY: number,
  nextX: number,
  nextZ: number,
  siteData: SiteData,
  opts?: { staging?: { x: number; z: number } },
): { blocked: boolean; y: number }
export function lightPoleSites(siteData: SiteData, staging: { x: number; z: number }): Array<{ x: number; z: number }>

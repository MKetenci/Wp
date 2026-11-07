/**
 * Loads a wiki "data" Lua module (a file that does `return { ... }`) and
 * converts the returned table into plain JS. Runs on fengari, a Lua VM in JS,
 * so no native Lua install is needed. `mw` is stubbed because a few modules
 * reference it at load time.
 */
import fs from 'node:fs';
import fengari from 'fengari';

const { lua, lauxlib, lualib, to_luastring } = fengari;

export function loadLuaTable(file) {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  lauxlib.luaL_dostring(
    L,
    to_luastring('mw = setmetatable({}, { __index = function() return function() return {} end end })')
  );
  if (lauxlib.luaL_loadbuffer(L, fs.readFileSync(file), null, to_luastring('@' + file)) !== 0) {
    throw new Error(`Lua yüklenemedi (${file}): ${lua.lua_tojsstring(L, -1)}`);
  }
  if (lua.lua_pcall(L, 0, 1, 0) !== 0) {
    throw new Error(`Lua çalıştırılamadı (${file}): ${lua.lua_tojsstring(L, -1)}`);
  }
  return toJs(L, -1);
}

function toJs(L, idx) {
  switch (lua.lua_type(L, idx)) {
    case lua.LUA_TNUMBER: return lua.lua_tonumber(L, idx);
    case lua.LUA_TSTRING: return lua.lua_tojsstring(L, idx);
    case lua.LUA_TBOOLEAN: return lua.lua_toboolean(L, idx);
    case lua.LUA_TTABLE: break;
    default: return null;
  }
  idx = lua.lua_absindex(L, idx);
  const entries = [];
  lua.lua_pushnil(L);
  while (lua.lua_next(L, idx) !== 0) {
    const key = lua.lua_type(L, -2) === lua.LUA_TNUMBER ? lua.lua_tonumber(L, -2) : lua.lua_tojsstring(L, -2);
    entries.push([key, toJs(L, -1)]);
    lua.lua_pop(L, 1);
  }
  // Lua sequences (1..n) become arrays.
  const isSeq = entries.length > 0 && entries.every(([k]) => typeof k === 'number') &&
    entries.map(([k]) => k).sort((a, b) => a - b).every((k, i) => k === i + 1);
  if (isSeq) return entries.sort((a, b) => a[0] - b[0]).map(([, v]) => v);
  return Object.fromEntries(entries);
}


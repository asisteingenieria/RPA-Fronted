import { beforeEach, describe, expect, it } from 'vitest';
import { can } from '@/components/panel/navigation';
import { hashPassword, passwordIssues, verifyPassword } from '@/lib/password';
import { backend } from './store';

const ADMIN = 'mtorres';
const PW = 'Clave-de-prueba-2026';

describe('contraseñas', () => {
  it('hash con sal: verifica la correcta y rechaza la incorrecta', async () => {
    const h = await hashPassword('abc12345678');
    expect(h.hash).not.toContain('abc');
    expect(await verifyPassword('abc12345678', h)).toBe(true);
    expect(await verifyPassword('abc12345679', h)).toBe(false);
  });
  it('política: mínimo 10, letras y números', () => {
    expect(passwordIssues('corta1')).toContain('Mínimo 10 caracteres');
    expect(passwordIssues('soloLetrasLargas')).toContain('Debe tener números');
    expect(passwordIssues('valida12345')).toEqual([]);
  });
});

describe('ingreso', () => {
  beforeEach(() => backend.resetDemo());

  it('sin contraseñas pide configuración inicial y solo para un administrador', async () => {
    expect(backend.needsSetup()).toBe(true);
    await expect(backend.setupAdmin('arojas', PW)).rejects.toThrow('no es administrador');
    await backend.setupAdmin(ADMIN, PW);
    expect(backend.needsSetup()).toBe(false);
    await expect(backend.setupAdmin(ADMIN, PW)).rejects.toThrow('ya se hizo');
  });

  it('ingresa con la contraseña correcta; mensaje genérico ante error', async () => {
    await backend.setupAdmin(ADMIN, PW);
    const r = await backend.login('MARIA.TORRES@claro.com.co', PW);
    expect(r.user.id).toBe(ADMIN);
    expect(r.mustChange).toBe(false);
    await expect(backend.login('maria.torres@claro.com.co', 'otra-clave-1')).rejects.toThrow('Correo o contraseña incorrectos');
    await expect(backend.login('nadie@claro.com.co', PW)).rejects.toThrow('Correo o contraseña incorrectos');
  });

  it('bloquea tras 5 intentos fallidos y el administrador desbloquea', async () => {
    await backend.setupAdmin(ADMIN, PW);
    const temp = await backend.setTempPassword({ name: 'María Torres', role: 'Administrador' }, 'arojas');
    for (let i = 0; i < 5; i++) await expect(backend.login('ana.rojas@claro.com.co', 'mala-clave-1')).rejects.toThrow();
    await expect(backend.login('ana.rojas@claro.com.co', temp)).rejects.toThrow('bloqueado');
    await backend.unlockUser({ name: 'María Torres', role: 'Administrador' }, 'arojas');
    const r = await backend.login('ana.rojas@claro.com.co', temp);
    expect(r.mustChange).toBe(true);
  }, 30_000);

  it('la temporal obliga a cambiarla y la nueva debe cumplir la política', async () => {
    await backend.setupAdmin(ADMIN, PW);
    const temp = await backend.setTempPassword({ name: 'María Torres', role: 'Administrador' }, 'jperez');
    await expect(backend.changePassword('jperez', temp, 'corta')).rejects.toThrow('Mínimo 10');
    await backend.changePassword('jperez', temp, 'NuevaClave2026');
    expect((await backend.login('juan.perez@claro.com.co', 'NuevaClave2026')).mustChange).toBe(false);
    const audit = backend.snapshot().audit.map((a) => a.action);
    expect(audit).toContain('Asignó contraseña temporal');
    expect(JSON.stringify(backend.snapshot().audit)).not.toContain('NuevaClave2026');
  }, 30_000);
});

describe('permisos', () => {
  it('el administrador puede hacer todo', () => {
    for (const a of ['editarBorrador', 'aprobar', 'publicar', 'editarLegal', 'configurar', 'apagarRobot'] as const) expect(can(['administrador'], a)).toBe(true);
    expect(can(['editor'], 'publicar')).toBe(false);
  });
});

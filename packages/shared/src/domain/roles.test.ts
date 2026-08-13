import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALL_PERMISSIONS, Permission } from './permissions';
import {
  Role,
  ROLE_PERMISSIONS,
  hasAnyPermission,
  isGroupScopedRole,
  isPlatformRole,
  permissionsForRoles,
  roleHasPermission,
} from './roles';

/** TZ §3: har bir rolning huquqlari qat'iy chegaralangan. */
describe('ROLE_PERMISSIONS', () => {
  it('SUPER_ADMIN barcha huquqlarga ega', () => {
    assert.equal(ROLE_PERMISSIONS[Role.SUPER_ADMIN].length, ALL_PERMISSIONS.length);
  });

  it('har bir rol uchun matritsa aniqlangan', () => {
    for (const role of Object.values(Role)) {
      assert.ok(ROLE_PERMISSIONS[role]?.length > 0, `${role} uchun huquq yo'q`);
    }
  });

  it('faqat OWNER va SUPER_ADMIN foydalanuvchi yaratadi', () => {
    const allowed = Object.values(Role).filter((role) =>
      roleHasPermission(role, Permission.USER_MANAGE),
    );
    assert.deepEqual(allowed, [Role.SUPER_ADMIN, Role.OWNER]);
  });

  it('tarbiyachi moliyaviy huquqlarga ega emas', () => {
    for (const permission of [
      Permission.INCOME_VIEW,
      Permission.EXPENSE_VIEW,
      Permission.PAYMENT_VIEW,
      Permission.DEBT_VIEW,
      Permission.USER_VIEW,
    ]) {
      assert.equal(
        roleHasPermission(Role.TEACHER, permission),
        false,
        `TEACHER ${permission} huquqiga ega bo'lmasligi kerak`,
      );
    }
  });

  it('tarbiyachi faqat o\'z guruhi bolalarini ko\'radi', () => {
    assert.equal(roleHasPermission(Role.TEACHER, Permission.CHILD_VIEW_OWN_GROUP), true);
    assert.equal(roleHasPermission(Role.TEACHER, Permission.CHILD_VIEW), false);
  });

  it('oshpaz retseptni boshqaradi, omborni o\'zgartirmaydi', () => {
    assert.equal(roleHasPermission(Role.COOK, Permission.RECIPE_MANAGE), true);
    assert.equal(roleHasPermission(Role.COOK, Permission.STOCK_VIEW), true);
    assert.equal(roleHasPermission(Role.COOK, Permission.STOCK_MANAGE), false);
  });

  it('omborchi moliyaga kira olmaydi', () => {
    assert.equal(roleHasPermission(Role.STOREKEEPER, Permission.EXPENSE_VIEW), false);
    assert.equal(roleHasPermission(Role.STOREKEEPER, Permission.STOCK_MANAGE), true);
  });

  it('buxgalter moliyani boshqaradi, ombor sarfini emas', () => {
    assert.equal(roleHasPermission(Role.ACCOUNTANT, Permission.PAYMENT_MANAGE), true);
    assert.equal(roleHasPermission(Role.ACCOUNTANT, Permission.STOCK_MANAGE), false);
  });

  it('administrator budjetga aralashmaydi', () => {
    assert.equal(roleHasPermission(Role.ADMINISTRATOR, Permission.BUDGET_MANAGE), false);
  });

  it('OWNER platforma darajasidagi huquqlarga ega emas', () => {
    assert.equal(roleHasPermission(Role.OWNER, Permission.TENANT_VIEW_ALL), false);
    assert.equal(roleHasPermission(Role.OWNER, Permission.TENANT_MANAGE), false);
  });
});

describe('permissionsForRoles', () => {
  it('bir nechta roldagi huquqlarni takrorlanmasdan birlashtiradi', () => {
    const merged = permissionsForRoles([Role.TEACHER, Role.COOK]);

    assert.equal(new Set(merged).size, merged.length);
    assert.ok(merged.includes(Permission.ATTENDANCE_MARK));
    assert.ok(merged.includes(Permission.RECIPE_MANAGE));
  });

  it('rol berilmasa bo\'sh ro\'yxat', () => {
    assert.deepEqual(permissionsForRoles([]), []);
  });
});

describe('hasAnyPermission', () => {
  it('kerakli huquqlardan bittasi bo\'lsa ruxsat beradi', () => {
    assert.equal(
      hasAnyPermission([Permission.CHILD_VIEW_OWN_GROUP], [
        Permission.CHILD_VIEW,
        Permission.CHILD_VIEW_OWN_GROUP,
      ]),
      true,
    );
  });

  it('hech biri bo\'lmasa rad etadi', () => {
    assert.equal(hasAnyPermission([Permission.RECIPE_VIEW], [Permission.PAYMENT_VIEW]), false);
  });

  it('huquq talab qilinmasa ochiq endpoint sifatida o\'tadi', () => {
    assert.equal(hasAnyPermission([], []), true);
  });
});

describe('rol chegaralari', () => {
  it('faqat SUPER_ADMIN tenant chegarasidan chiqadi', () => {
    assert.equal(isPlatformRole(Role.SUPER_ADMIN), true);
    assert.equal(isPlatformRole(Role.OWNER), false);
  });

  it('faqat tarbiyachi guruh bilan cheklanadi', () => {
    assert.equal(isGroupScopedRole(Role.TEACHER), true);
    assert.equal(isGroupScopedRole(Role.ADMINISTRATOR), false);
  });
});

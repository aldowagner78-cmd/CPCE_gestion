import fs from 'node:fs'
import path from 'node:path'
import { ROLE_PERMISSIONS, UserRole, Permission } from '../src/types/auth'

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    bold: '\x1b[1m',
}

let passCount = 0
let failCount = 0

function logResult(name: string, ok: boolean, detail?: string) {
    if (ok) {
        passCount++
        console.log(`${colors.green}[PASS]${colors.reset} ${name}`)
    } else {
        failCount++
        console.log(`${colors.red}[FAIL]${colors.reset} ${name}`)
        if (detail) console.log(`${colors.yellow}       ${detail}${colors.reset}`)
    }
}

function getPermissionsFromFile(filePath: string): Permission[] {
    const fullPath = path.resolve(process.cwd(), filePath)
    const content = fs.readFileSync(fullPath, 'utf8')
    const regex = /permission:\s*'([^']+)'/g
    const found = new Set<Permission>()

    let match: RegExpExecArray | null
    while ((match = regex.exec(content)) !== null) {
        found.add(match[1] as Permission)
    }

    return Array.from(found)
}

function roleHas(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role].includes(permission)
}

function runRoleContractTests() {
    console.log(`\n${colors.bold}--- CONTRATO DE ROLES (NEGOCIO) ---${colors.reset}`)

    const requiredByRole: Record<UserRole, Permission[]> = {
        superuser: ['dashboard.view', 'users.manage', 'backup.export'],
        admin: ['dashboard.view', 'users.manage', 'nomenclators.manage'],
        supervisor: ['audits.approve', 'pending.view', 'alerts.resolve'],
        auditor: ['audits.create', 'pending.view', 'protocols.view'],
        administrativo: ['patients.manage', 'agenda.create', 'calculator.use'],
        gerencia: ['dashboard.view', 'audits.view', 'stats.view'],
    }

    const forbiddenByRole: Partial<Record<UserRole, Permission[]>> = {
        administrativo: ['users.manage', 'backup.export', 'nomenclators.manage'],
        gerencia: ['users.manage', 'audits.approve', 'agenda.create', 'patients.manage'],
        auditor: ['users.manage', 'backup.export', 'config.view'],
    }

    ;(Object.keys(requiredByRole) as UserRole[]).forEach((role) => {
        requiredByRole[role].forEach((perm) => {
            logResult(`${role} incluye ${perm}`, roleHas(role, perm))
        })
    })

    ;(Object.keys(forbiddenByRole) as UserRole[]).forEach((role) => {
        forbiddenByRole[role]?.forEach((perm) => {
            logResult(`${role} NO incluye ${perm}`, !roleHas(role, perm))
        })
    })
}

function runNavigationPermissionTests() {
    console.log(`\n${colors.bold}--- PERMISOS EN NAVEGACIÓN ---${colors.reset}`)

    const sidebarPerms = getPermissionsFromFile('src/components/layout/Sidebar.tsx')
    const commandPerms = getPermissionsFromFile('src/components/layout/CommandPalette.tsx')
    const allNavPerms = Array.from(new Set([...sidebarPerms, ...commandPerms]))

    const allRolePerms = new Set(Object.values(ROLE_PERMISSIONS).flat())

    allNavPerms.forEach((perm) => {
        const usedByAnyRole = allRolePerms.has(perm)
        logResult(`permiso de navegación asignado: ${perm}`, usedByAnyRole)
    })

    // Consistencia: todos los permisos del sidebar deben existir también en palette
    sidebarPerms.forEach((perm) => {
        logResult(
            `sidebar permiso también en command palette: ${perm}`,
            commandPerms.includes(perm),
            `Falta ${perm} en CommandPalette`
        )
    })
}

function main() {
    console.log('Iniciando pruebas de acceso por rol...')
    runRoleContractTests()
    runNavigationPermissionTests()

    console.log(`\n${colors.bold}RESUMEN ROLES:${colors.reset}`)
    console.log(`Total: ${passCount + failCount}`)
    console.log(`${colors.green}PASS: ${passCount}${colors.reset}`)
    console.log(`${colors.red}FAIL: ${failCount}${colors.reset}`)

    if (failCount > 0) process.exit(1)
}

main()

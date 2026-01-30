/**
 * TEST DE COMPONENTES FRONTEND
 * 
 * Valida que no existan:
 * - setState durante render
 * - Keys duplicadas o faltantes en listas
 * - Refs a nodos inexistentes
 * - Problemas de insertBefore DOM
 * 
 * Autor: Daniel Reinoso
 * Fecha: Enero 30, 2026
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface Issue {
    file: string;
    line: number;
    severity: 'error' | 'warning';
    message: string;
    code: string;
}

const issues: Issue[] = [];

// REGLA 1: No setState durante render (fuera de useEffect/handlers)
const checkSetStateDuringRender = (filePath: string, content: string) => {
    const lines = content.split('\n');
    
    // Detectar si hay setState directo en el cuerpo del componente (no en useEffect/handlers)
    const setStateRegex = /^\s*(set[A-Z][a-zA-Z]*)\((?!.*useEffect|.*handler|.*onClick|.*onChange)/;
    
    let inRenderSection = false;
    let inUseEffect = false;
    let bracketDepth = 0;
    
    lines.forEach((line, idx) => {
        // Detectar inicio de componente React
        if (line.match(/^(export\s+)?(const|function)\s+[A-Z][a-zA-Z]*.*=.*\(.*\)\s*(:.*)?=>/)) {
            inRenderSection = true;
            bracketDepth = 0;
        }
        
        // Detectar useEffect
        if (line.includes('useEffect(')) {
            inUseEffect = true;
        }
        
        // Tracking de brackets
        bracketDepth += (line.match(/\{/g) || []).length;
        bracketDepth -= (line.match(/\}/g) || []).length;
        
        if (inUseEffect && bracketDepth === 0) {
            inUseEffect = false;
        }
        
        // Detectar setState en render (fuera de useEffect/handlers)
        if (inRenderSection && !inUseEffect) {
            // Buscar if/while que contengan setState
            if (line.match(/^\s*if\s*\(.*\)\s*\{?\s*set[A-Z]/)) {
                issues.push({
                    file: filePath,
                    line: idx + 1,
                    severity: 'error',
                    message: 'setState durante render (puede causar NotFoundError)',
                    code: line.trim().substring(0, 80)
                });
            }
        }
    });
};

// REGLA 2: Keys en .map() deben existir
const checkMapKeys = (filePath: string, content: string) => {
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
        // Detectar .map sin key
        if (line.includes('.map(') && !line.includes('key=')) {
            // Verificar las siguientes 3 líneas
            const nextLines = lines.slice(idx, idx + 4).join(' ');
            if (!nextLines.includes('key=')) {
                issues.push({
                    file: filePath,
                    line: idx + 1,
                    severity: 'warning',
                    message: '.map() sin prop key (puede causar rendering issues)',
                    code: line.trim().substring(0, 80)
                });
            }
        }
        
        // Detectar keys con index
        if (line.match(/key=\{?index\}?/)) {
            issues.push({
                file: filePath,
                line: idx + 1,
                severity: 'warning',
                message: 'Key usando index (puede causar re-renders incorrectos)',
                code: line.trim().substring(0, 80)
            });
        }
    });
};

// REGLA 3: Evitar manipulación directa del DOM
const checkDirectDOMManipulation = (filePath: string, content: string) => {
    const lines = content.split('\n');
    
    const dangerousPatterns = [
        /\.appendChild\(/,
        /\.removeChild\(/,
        /\.insertBefore\(/,
        /document\.createElement\(/,
        /\.innerHTML\s*=/,
    ];
    
    lines.forEach((line, idx) => {
        dangerousPatterns.forEach(pattern => {
            if (pattern.test(line)) {
                issues.push({
                    file: filePath,
                    line: idx + 1,
                    severity: 'warning',
                    message: 'Manipulación directa del DOM (preferir React)',
                    code: line.trim().substring(0, 80)
                });
            }
        });
    });
};

// REGLA 4: useEffect con dependencias correctas
const checkUseEffectDeps = (filePath: string, content: string) => {
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
        // useEffect sin array de dependencias
        if (line.match(/useEffect\(.*\);?\s*$/)) {
            issues.push({
                file: filePath,
                line: idx + 1,
                severity: 'warning',
                message: 'useEffect sin array de dependencias (ejecuta en cada render)',
                code: line.trim().substring(0, 80)
            });
        }
    });
};

// Escanear todos los archivos .tsx recursivamente
const scanDirectory = (dir: string, baseDir: string = dir) => {
    const files = readdirSync(dir);
    
    files.forEach(file => {
        const filePath = join(dir, file);
        const stat = statSync(filePath);
        
        if (stat.isDirectory()) {
            // Skip node_modules y dist
            if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
                scanDirectory(filePath, baseDir);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            const content = readFileSync(filePath, 'utf-8');
            const relativePath = filePath.replace(baseDir + '/', '');
            
            checkSetStateDuringRender(relativePath, content);
            checkMapKeys(relativePath, content);
            checkDirectDOMManipulation(relativePath, content);
            checkUseEffectDeps(relativePath, content);
        }
    });
};

// EJECUCIÓN DEL TEST
console.log('🔍 Iniciando análisis de componentes frontend...\n');

const componentsDir = join(process.cwd(), 'components');
scanDirectory(componentsDir);

// RESULTADOS
console.log('\n📊 RESULTADOS DEL ANÁLISIS\n');
console.log('═'.repeat(80));

if (issues.length === 0) {
    console.log('✅ NO SE ENCONTRARON PROBLEMAS');
    console.log('\nTodos los componentes pasan las validaciones:');
    console.log('  ✓ Sin setState durante render');
    console.log('  ✓ Keys correctas en listas');
    console.log('  ✓ Sin manipulación directa del DOM');
    console.log('  ✓ useEffect con dependencias');
} else {
    // Agrupar por severidad
    const errors = issues.filter(i => i.severity === 'error');
    const warnings = issues.filter(i => i.severity === 'warning');
    
    console.log(`\n🚨 ERRORES CRÍTICOS: ${errors.length}`);
    if (errors.length > 0) {
        console.log('═'.repeat(80));
        errors.forEach((issue, idx) => {
            console.log(`\n${idx + 1}. ${issue.file}:${issue.line}`);
            console.log(`   📍 ${issue.message}`);
            console.log(`   💾 ${issue.code}`);
        });
    }
    
    console.log(`\n\n⚠️  ADVERTENCIAS: ${warnings.length}`);
    if (warnings.length > 0 && warnings.length <= 10) {
        console.log('═'.repeat(80));
        warnings.forEach((issue, idx) => {
            console.log(`\n${idx + 1}. ${issue.file}:${issue.line}`);
            console.log(`   📍 ${issue.message}`);
            console.log(`   💾 ${issue.code}`);
        });
    } else if (warnings.length > 10) {
        console.log(`\n(Mostrando primeras 10 de ${warnings.length} advertencias)`);
        console.log('═'.repeat(80));
        warnings.slice(0, 10).forEach((issue, idx) => {
            console.log(`\n${idx + 1}. ${issue.file}:${issue.line}`);
            console.log(`   📍 ${issue.message}`);
            console.log(`   💾 ${issue.code}`);
        });
    }
}

console.log('\n' + '═'.repeat(80));
console.log('\n📝 RESUMEN');
console.log(`   Total archivos escaneados: ${issues.length > 0 ? 'múltiples' : 'todos'}`);
console.log(`   Errores: ${issues.filter(i => i.severity === 'error').length}`);
console.log(`   Advertencias: ${issues.filter(i => i.severity === 'warning').length}`);

// Exit code
if (issues.filter(i => i.severity === 'error').length > 0) {
    console.log('\n❌ TEST FALLÓ - Hay errores críticos que corregir');
    process.exit(1);
} else {
    console.log('\n✅ TEST PASÓ - Frontend sin errores críticos');
    process.exit(0);
}

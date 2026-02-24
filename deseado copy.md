Restricciones Críticas:
Análisis de Impacto: Antes de proponer el código, identifica qué otros módulos, servicios o configuraciones dependen de la interfaz actual de este componente (firmas de métodos, tipos de retorno, eventos emitidos).
Principio de Mínima Intervención: Prioriza soluciones que no alteren la API pública del componente para evitar romper contratos con otros módulos.
Validación de Efectos Secundarios: Si el cambio requiere modificar una configuración global o una dependencia compartida, lístalo explícitamente como un "Riesgo de Regresión".
Tarea:
Proporciona el código corregido.
Explica por qué esta solución es la más segura frente a las dependencias mencionadas.
Genera una pequeña lista de verificación (checklist) de pruebas que debo ejecutar en los módulos adyacentes para asegurar que nada se rompió.
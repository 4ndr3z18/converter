---
template: apa7
title: "Adopción de herramientas de inteligencia artificial generativa en la gestión de proyectos de software: estudio de caso en equipos universitarios"
report_type: "Informe de investigación"

author:
  name: "Pérez Quispe, Ana Lucía"
  id: "20231234"

affiliation:
  university: "Universidad Nacional de Ejemplo"
  faculty: "Facultad de Ingeniería"
  logo: "/samples/logo-demo.svg"

course:
  name: "Ingeniería de Software"
  code: "IS-601"

professor:
  name: "Ramírez Torres, Carlos"
  title: "Dr."

section: "A"
cycle: "2026-I"
city: "Lima"
date: 2026-10-22
keywords:
  - inteligencia artificial generativa
  - gestión de proyectos
  - ingeniería de software
  - productividad
  - educación superior
---

## Resumen

La creciente disponibilidad de herramientas de inteligencia artificial generativa ha transformado la forma en que los equipos de desarrollo planifican, implementan y documentan sus proyectos. Este informe analiza la adopción de estas herramientas en equipos universitarios de ingeniería de software y su relación con la productividad percibida. Se realizó un estudio de caso con 24 estudiantes organizados en seis equipos durante un ciclo académico de dieciséis semanas. Los datos se recogieron mediante cuestionarios, registros de repositorio y entrevistas semiestructuradas. Los resultados muestran una adopción alta en tareas de codificación y generación de pruebas, y una adopción baja en documentación y gestión de riesgos. El índice de adopción global fue de 68.8 puntos sobre 100, con diferencias significativas entre fases del ciclo de vida. Se concluye que la adopción es desigual y que las competencias de verificación crítica son el principal factor mediador. Se recomienda incorporar lineamientos explícitos de uso y auditoría en los cursos de proyectos.

## Introducción

La ingeniería de software ha incorporado progresivamente asistentes basados en modelos de lenguaje en actividades que antes dependían exclusivamente del razonamiento humano. Estas herramientas prometen reducir el esfuerzo de codificación, acelerar la generación de pruebas y mejorar la calidad de la documentación técnica. Sin embargo, la evidencia sobre su impacto real en contextos académicos sigue siendo limitada y fragmentada.

En los cursos de proyectos de software, la adopción de asistentes de inteligencia artificial plantea una tensión entre productividad y aprendizaje. Por un lado, los estudiantes pueden completar entregables en menos tiempo y explorar soluciones con mayor amplitud. Por otro, existe el riesgo de delegar decisiones de diseño sin comprender sus consecuencias, lo que debilita las competencias que el curso busca desarrollar. Esta tensión se agrava cuando no existen lineamientos institucionales claros sobre qué usos son aceptables y cómo deben declararse.

El presente informe aborda esa brecha mediante un estudio de caso longitudinal en un curso de Ingeniería de Software. Se examina qué herramientas utilizan los equipos, en qué fases del ciclo de vida las emplean y cómo perciben su efecto sobre la productividad y la calidad del producto. El estudio no busca establecer causalidad, sino describir patrones de adopción y formular recomendaciones para la enseñanza.

### Planteamiento del problema

Los equipos universitarios adoptan herramientas de inteligencia artificial generativa de manera informal, sin un marco común de uso, verificación y trazabilidad. Esta adopción informal dificulta distinguir entre un uso que potencia el aprendizaje y un uso que lo sustituye. Además, los docentes carecen de instrumentos para observar y evaluar el proceso, no solo el producto final.

### Objetivos

El objetivo general es analizar la adopción de herramientas de inteligencia artificial generativa en equipos universitarios de desarrollo de software. Los objetivos específicos son: identificar las herramientas y los usos predominantes; estimar un índice de adopción por fase del ciclo de vida; y describir los factores que facilitan o limitan su integración en el trabajo del equipo.

## Marco teórico

La literatura sobre asistentes de código distingue entre herramientas de autocompletado, agentes conversacionales y sistemas integrados en el entorno de desarrollo. Los estudios iniciales reportan mejoras en la velocidad de escritura de código, pero también advierten sobre defectos sutiles y dependencia excesiva de las sugerencias. La calidad del resultado depende, en gran medida, de la capacidad del desarrollador para formular instrucciones precisas y verificar las respuestas.

### Inteligencia artificial generativa en el ciclo de vida del software

En la fase de planificación, los modelos de lenguaje pueden apoyar la redacción de historias de usuario, la identificación de riesgos y la estimación preliminar de esfuerzos. En la fase de construcción, los asistentes integrados en el editor sugieren fragmentos completos y explican código existente. En la fase de pruebas, generan casos, datos y aserciones. En la fase de documentación, producen borradores de manuales y comentarios técnicos. Cada fase presenta riesgos distintos: ambigüedad en los requisitos, código plausible pero incorrecto, pruebas que validan supuestos erróneos o documentación desactualizada.

### Gestión de proyectos y productividad

La productividad en equipos pequeños no se reduce al volumen de código producido. Involucra coordinación, claridad de objetivos, gestión de dependencias y capacidad de respuesta ante cambios. Las herramientas generativas pueden reducir el tiempo dedicado a tareas repetitivas, pero también introducen costos de verificación y coordinación. Un estudio de casos múltiples encontró que los equipos con prácticas de revisión sólidas obtenían mejores resultados que aquellos que adoptaban las herramientas sin modificar sus procesos.

### Brecha entre adopción y evidencia

Pese al interés creciente, la mayoría de las investigaciones se concentra en desarrolladores profesionales y en métricas de corto plazo. Son escasos los estudios que examinan equipos universitarios, donde el objetivo principal es el aprendizaje y no la entrega de un producto comercial. Esta brecha justifica un enfoque descriptivo y contextualizado, capaz de capturar las prácticas reales de los equipos y las percepciones de sus integrantes.

> La evidencia disponible sugiere que el valor de estas herramientas no proviene de la automatización por sí misma, sino de la calidad de las decisiones que el equipo toma al integrarlas en su flujo de trabajo (Martínez y Solís, 2024, p. 87).

## Metodología

### Diseño y participantes

Se adoptó un diseño de estudio de caso único con unidades de análisis correspondientes a seis equipos de proyecto. Participaron 24 estudiantes de la asignatura Ingeniería de Software, organizados en equipos de cuatro integrantes. La selección fue intencional y cubrió las dos secciones del curso. Todos los participantes firmaron un consentimiento informado y se garantizó la confidencialidad de los registros.

### Instrumentos y procedimiento

Se aplicaron tres instrumentos: un cuestionario inicial sobre experiencia previa con herramientas generativas, un registro semanal de uso declarado y una entrevista semiestructurada al final del ciclo. Adicionalmente, se analizaron los historiales de los repositorios para contrastar el uso declarado con la actividad registrada. El trabajo de campo se extendió durante dieciséis semanas, con observación no participante en las sesiones de revisión.

El índice de adopción por fase se calculó a partir de la proporción entre usos observados y usos esperados, expresada en una escala de 0 a 100:

$$IAR = \frac{U}{H} \times 100$$

donde $U$ representa los usos verificados de herramientas generativas en la fase y $H$ el número de horas efectivas dedicadas a esa fase por el equipo. Los valores se normalizaron para permitir comparaciones entre equipos con distinta carga de trabajo.

### Análisis de datos

Los datos cuantitativos se resumieron mediante estadística descriptiva. Las entrevistas se transcribieron y codificaron con un esquema mixto, combinando categorías deductivas derivadas del marco teórico con categorías emergentes. Dos investigadores codificaron de forma independiente el 30 % de las transcripciones y resolvieron las discrepancias mediante discusión.

## Resultados

La adopción de herramientas generativas fue heterogénea entre fases. La codificación concentró la mayor frecuencia de uso, seguida por la generación de pruebas y la planificación. La documentación y la gestión de riesgos registraron los valores más bajos. La tabla 1 resume la frecuencia de uso declarada y verificada por fase.

Tabla 1. Frecuencia de uso de herramientas de IA por fase del proyecto

| Fase | Usos declarados | Usos verificados | Índice de adopción |
|---|---:|---:|---:|
| Planificación | 58 | 49 | 78 |
| Codificación | 142 | 131 | 92 |
| Pruebas | 76 | 61 | 64 |
| Documentación | 33 | 21 | 41 |

![Figura 1. Índice de adopción por dimensión del ciclo de vida](/samples/figura-1.svg)

Los equipos con mayor índice de adopción en codificación también reportaron más tiempo dedicado a revisión de código. En las entrevistas, los participantes describieron un patrón recurrente: primero generaban una solución con el asistente y luego la contrastaban con pruebas manuales o con la revisión de un compañero. Este patrón sugiere que la adopción efectiva depende de prácticas de verificación preexistentes.

La documentación fue la fase menos atendida. Varios equipos señalaron que la generación de documentación con asistentes producía textos genéricos que no reflejaban las decisiones reales del proyecto. En consecuencia, preferían escribir manuales breves por su cuenta antes que corregir un borrador extenso generado automáticamente.

## Discusión

Los resultados confirman una adopción desigual que coincide con lo reportado en estudios sobre desarrolladores profesionales. La codificación es la fase con menor costo de verificación inmediata, lo que explica su alta frecuencia. En cambio, la documentación exige contexto organizacional y trazabilidad, aspectos que los modelos genéricos no capturan con precisión.

El hallazgo más relevante es la relación entre adopción y verificación. Los equipos que obtuvieron mejores resultados no fueron necesariamente los que más usaron las herramientas, sino los que contaban con rutinas de revisión y pruebas. Esto sugiere que la enseñanza debería priorizar la evaluación crítica de las sugerencias sobre la mera familiaridad con la herramienta.

El estudio presenta limitaciones. La muestra es pequeña y corresponde a una sola institución, por lo que los resultados no son generalizables. Además, el índice de adopción depende de registros declarados y de la interpretación de la actividad del repositorio. Futuras investigaciones podrían ampliar la muestra y combinar métodos observacionales con métricas de calidad del producto.

## Conclusiones

La adopción de herramientas de inteligencia artificial generativa en equipos universitarios de ingeniería de software es alta en codificación y pruebas, y baja en documentación y gestión de riesgos. El índice global de adopción fue de 68.8 puntos, con variaciones importantes entre fases y equipos.

La verificación crítica se identificó como el principal factor mediador entre el uso de la herramienta y la calidad percibida del trabajo. Los equipos que mantuvieron prácticas de revisión y prueba obtuvieron mejores resultados que aquellos que delegaron el trabajo sin control. En consecuencia, la integración de estas herramientas en la enseñanza debe acompañarse de lineamientos explícitos y de espacios de reflexión sobre sus límites.

## Recomendaciones

Se recomienda incorporar en el sílabo un apartado sobre uso responsable de herramientas generativas, con criterios de declaración y verificación. También se sugiere diseñar actividades que obliguen a contrastar las sugerencias del asistente con pruebas y con revisión entre pares. A nivel de curso, conviene registrar las decisiones de diseño y los cambios introducidos por la herramienta, de modo que el proceso pueda evaluarse además del producto.

Para futuras investigaciones, se recomienda ampliar la muestra a varias instituciones y utilizar instrumentos que permitan medir la calidad del código y de la documentación con mayor precisión. Asimismo, sería valioso comparar equipos con y sin lineamientos explícitos para estimar el efecto de las políticas de uso.

## Referencias

García, M. y Torres, L. (2023). Asistentes de código y aprendizaje de la programación: una revisión sistemática. Revista de Educación en Ingeniería, 18(2), 45–67.

Hernández, R., Fernández, C. y Baptista, P. (2024). Metodología de la investigación (7.ª ed.). McGraw-Hill.

Martínez, P. y Solís, J. (2024). Productividad y verificación en el uso de modelos de lenguaje para desarrollo de software. Editorial Universitaria.

Morales, A. (2022). Gestión de proyectos de software en contextos académicos. Fondo Editorial de la Facultad.

Navarro, S. y Delgado, R. (2025). Evaluación de la calidad de pruebas generadas automáticamente. Journal of Software Engineering Education, 12(1), 1–19.

Ochoa, L. (2023). Inteligencia artificial generativa en la educación superior: oportunidades y riesgos. Revista Iberoamericana de Tecnología Educativa, 9(3), 112–130.

Rojas, C. y Paredes, M. (2024). Prácticas de revisión de código en equipos estudiantiles. Actas del Congreso Latinoamericano de Ingeniería de Software, 233–241.

Salazar, D. (2021). Fundamentos de ingeniería de software. Editorial Técnica.

Vargas, E. y Núñez, F. (2025). Uso declarado y uso observado de asistentes de IA en proyectos universitarios. Revista de Investigación en Computación, 27(4), 88–104.

Zevallos, I. (2024). Lineamientos para el uso responsable de herramientas generativas en la universidad. Vicerrectoría Académica.

## Anexos

### Anexo A. Protocolo de entrevista semiestructurada

```text
1. ¿Qué herramientas de IA utilizaste durante el proyecto?
2. ¿En qué momentos del trabajo recurriste a ellas?
3. ¿Cómo verificabas las sugerencias que recibías?
4. ¿Qué tareas decidiste no delegar? ¿Por qué?
5. ¿Qué cambiarías en la forma de trabajar del equipo?
```

### Anexo B. Matriz de codificación

| Categoría | Descripción | Ejemplo |
|---|---|---|
| Uso instrumental | La herramienta ejecuta una tarea acotada | Generar una función de validación |
| Uso exploratorio | La herramienta amplía opciones de diseño | Comparar dos arquitecturas |
| Uso sustitutivo | La herramienta reemplaza la comprensión | Aceptar código sin revisarlo |
| Verificación | El equipo contrasta la sugerencia | Pruebas y revisión entre pares |

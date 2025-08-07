# ASafe Monorepo

Prueba Técnica: Desarrollador Node.js con TypeScript, Fastify, Prisma y Monorepo

## Arquitectura

Este es un monorepo que contiene múltiples paquetes que trabajan juntos para crear una solución API completa:

```
packages/
├── types/          # Tipos e interfaces TypeScript compartidos
├── utilities/      # Funciones de utilidad compartidas
├── services/       # Servicios de lógica de negocio
└── api/           # Servidor principal de la API Fastify
```

## Dependencias de Paquetes

Los paquetes tienen la siguiente jerarquía de dependencias:

```
api
├── services
│   └── types
├── utilities
└── types

services
└── types

utilities
(sin dependencias internas)

types
(sin dependencias internas)
```

## Primeros Pasos

### Requisitos Previos

- Node.js >= 20.0.0
- Yarn (para gestión de workspaces)
- Base de datos PostgreSQL

### Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/javierlinked/fastify-prisma-monorepo
cd asafe-1
```

2. Instalar dependencias:
```bash
yarn install
```

3. Configurar variables de entorno:
```bash
cp packages/api/.env.example packages/api/.env
cp packages/api/.env.example packages/services/.env
# Editar el archivo .env con las credenciales de tu base de datos
```

4. Generar cliente de Prisma:
```bash
yarn db:generate
```

5. Ejecutar migraciones de base de datos:
```bash
yarn db:migrate
```

## Build

### Build Todos los Paquetes

El proceso de construcción sigue el orden correcto de dependencias:

```bash
yarn build
```

Esto ejecuta:
1. `yarn build:types` - Construye tipos compartidos
2. `yarn build:utilities` - Construye funciones de utilidad  
3. `yarn build:services` - Construye servicios de lógica de negocio
4. `yarn build:api` - Construye el servidor principal de la API


## Pruebas

### Ejecutar Todas las Pruebas

```bash
yarn test
```

### Ejecutar Pruebas para Paquete Específico

```bash
yarn workspace @asafe/api test
yarn workspace @asafe/services test
yarn workspace @asafe/utilities test
```

## Desarrollo

### Iniciar Servidor de Desarrollo

```bash
yarn dev
```

Esto inicia el servidor API con recarga en caliente usando `tsx watch`.

### Calidad de Código

```bash
# Verificar problemas de linting y formato
yarn check

# Corregir todos los problemas
yarn fix
```

### Iniciar Servidor de Producción

```bash
yarn start
```

## Gestión de Base de Datos

### Generar Cliente de Prisma

```bash
yarn db:generate
```

### Ejecutar Migraciones

```bash
yarn db:migrate
```

### Abrir Prisma Studio

```bash
yarn db:studio
```

## Documentación de la API

Una vez que el servidor esté ejecutándose, puedes acceder a:

- **Documentación de la API**: http://localhost:3000/docs
- **Healthcheck**: http://localhost:3000/health

## Detalles de Paquetes

### @asafe/types
Contiene interfaces y tipos TypeScript compartidos:
- Modelos de Usuario y Post
- Tipos de request/response de API
- Re-exportaciones de tipos generados por Prisma

### @asafe/utilities
Funciones de utilidad compartidas:
- Utilidades de carga de archivos
- Funciones helper comunes
- Utilidades de validación

### @asafe/services
Servicios de lógica de negocio:
- UserService: Operaciones de gestión de usuarios
- PostService: Operaciones CRUD de posts
- NotificationService: Notificaciones en tiempo real

### @asafe/api
Servidor principal de la API Fastify:
- Endpoints de API REST
- Soporte WebSocket para características en tiempo real
- Middleware de autenticación
- Documentación Swagger
- Manejo de carga de archivos

## Características de Seguridad

- Autenticación basada en JWT
- Hash de contraseñas con bcrypt
- Validación de entrada con Zod
- Configuración CORS
- Limitación de velocidad lista

## Endpoints de la API

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión de usuario
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/refresh` - Actualizar token

### Usuarios
- `GET /api/users` - Listar usuarios
- `GET /api/users/:id` - Obtener usuario por ID
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario

### Posts
- `GET /api/posts` - Listar posts
- `POST /api/posts` - Crear post
- `GET /api/posts/:id` - Obtener post por ID
- `PUT /api/posts/:id` - Actualizar post
- `DELETE /api/posts/:id` - Eliminar post

### Carga de Archivos
- `POST /api/upload` - Subir archivo

### Notificaciones (WebSocket)
- `GET /api/notifications/ws` - Conexión WebSocket
- `POST /api/notifications/send/:userId` - Enviar notificación
- `POST /api/notifications/broadcast` - Difundir notificación

## Despliegue

### Construcción de Producción

```bash
yarn clean
yarn build
```

### Soporte Docker

Se incluye un Dockerfile para despliegue en contenedores:

```bash
docker build -t fastify-prisma-monorepo .
docker run -p 3000:3000 fastify-prisma-monorepo
```

### TODO

- [ ] Dependecy injection
- [ ] Better file handling on users PUT
- [ ] Many more


## Licencia

Licencia MIT - ver archivo LICENSE

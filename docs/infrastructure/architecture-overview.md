# 🏛️ Architecture Overview

This document provides a comprehensive overview of the Friendlines v2.0 system architecture, including design decisions, component interactions, and infrastructure patterns.

## 🎯 System Overview

Friendlines v2.0 is a modern social news application built with a microservices-inspired architecture, featuring a React Native frontend and a Node.js backend API. The system is designed for high availability, scalability, and maintainability.

## 🏗️ High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[Mobile App - Expo/React Native]
        B[Web App - React]
        C[Admin Dashboard]
    end
    
    subgraph "API Gateway Layer"
        D[Express API Server]
        E[Rate Limiting]
        F[Authentication]
        G[Request Validation]
    end
    
    subgraph "Service Layer"
        H[User Service]
        I[Post Service]
        J[Group Service]
        K[Notification Service]
        L[Social Service]
        M[Upload Service]
    end
    
    subgraph "Data Layer"
        N[JSON Files]
        O[SQLite Database]
        P[File Storage]
    end
    
    subgraph "Infrastructure Layer"
        Q[Container Orchestration]
        R[Load Balancer]
        S[CDN]
        T[Monitoring]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    D --> F
    D --> G
    D --> H
    D --> I
    D --> J
    D --> K
    D --> L
    D --> M
    H --> N
    I --> N
    J --> N
    K --> N
    L --> N
    M --> P
    H --> O
    I --> O
    J --> O
    K --> O
    L --> O
    Q --> R
    R --> S
    T --> Q
```

## 🧩 Component Architecture

### 1. Frontend Architecture (Expo/React Native)

```mermaid
graph LR
    subgraph "Frontend Stack"
        A[Expo Router] --> B[React Native]
        B --> C[NativeWind/Tailwind]
        B --> D[React Context]
        B --> E[Custom Hooks]
    end
    
    subgraph "State Management"
        F[Global Context] --> G[User Context]
        F --> H[Post Context]
        F --> I[Group Context]
    end
    
    subgraph "Services"
        J[API Service] --> K[HTTP Client]
        L[Notification Service] --> M[Push Notifications]
        N[Storage Service] --> O[AsyncStorage]
    end
    
    B --> F
    B --> J
    B --> L
    B --> N
```

### 2. Backend Architecture (Node.js/Express)

```mermaid
graph TB
    subgraph "Request Flow"
        A[HTTP Request] --> B[Rate Limiter]
        B --> C[Authentication]
        C --> D[Validation]
        D --> E[Controller]
        E --> F[Service Layer]
        F --> G[Data Access]
        G --> H[Response]
    end
    
    subgraph "Middleware Stack"
        I[Helmet Security]
        J[CORS]
        K[Body Parser]
        L[Error Handler]
    end
    
    subgraph "Data Access Layer"
        M[File Utils] --> N[JSON Files]
        O[Database Utils] --> P[SQLite]
        Q[Upload Utils] --> R[File System]
    end
    
    A --> I
    A --> J
    A --> K
    E --> M
    E --> O
    E --> Q
    H --> L
```

## 📊 Data Architecture

### Data Storage Strategy

```mermaid
graph LR
    subgraph "Primary Storage"
        A[JSON Files] --> B[users.json]
        A --> C[posts.json]
        A --> D[groups.json]
        A --> E[notifications.json]
    end
    
    subgraph "Secondary Storage"
        F[SQLite Database] --> G[User Sessions]
        F --> H[Analytics]
        F --> I[Audit Logs]
    end
    
    subgraph "File Storage"
        J[Uploads Directory] --> K[User Avatars]
        J --> L[Post Images]
        J --> M[Group Icons]
    end
    
    A --> F
    A --> J
```

### Data Flow Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **CRUD Operations** | User management, posts, groups | JSON file operations via `fileUtils.js` |
| **Session Management** | User authentication | SQLite with session tokens |
| **File Uploads** | Images, documents | Multer middleware + file system |
| **Caching** | Frequently accessed data | In-memory caching (planned) |
| **Backup** | Data protection | Git-based versioning + automated backups |

## 🔄 API Architecture

### RESTful Endpoint Structure

```mermaid
graph TB
    subgraph "API Endpoints"
        A[/api] --> B[/auth]
        A --> C[/users]
        A --> D[/posts]
        A --> E[/groups]
        A --> F[/social]
        A --> G[/notifications]
        A --> H[/upload]
    end
    
    subgraph "Authentication"
        B --> I[POST /login]
        B --> J[POST /register]
        B --> K[POST /logout]
        B --> L[GET /profile]
    end
    
    subgraph "User Management"
        C --> M[GET /users]
        C --> N[GET /users/:id]
        C --> O[PUT /users/:id]
        C --> P[DELETE /users/:id]
    end
    
    subgraph "Content Management"
        D --> Q[GET /posts]
        D --> R[POST /posts]
        D --> S[PUT /posts/:id]
        D --> T[DELETE /posts/:id]
    end
```

### Response Format Standardization

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-12-17T10:30:00Z",
  "requestId": "req_123456789"
}
```

## 🏢 Infrastructure Patterns

### Multi-Platform Deployment

```mermaid
graph TB
    subgraph "Deployment Platforms"
        A[Railway] --> B[Primary Production]
        C[Vercel] --> D[Serverless Backup]
        E[Render] --> F[Container Backup]
        G[AWS] --> H[Enterprise Option]
    end
    
    subgraph "Load Balancing"
        I[Cloudflare] --> A
        I --> C
        I --> E
        I --> G
    end
    
    subgraph "Monitoring"
        J[Health Checks] --> A
        J --> C
        J --> E
        J --> G
        K[Logging] --> A
        K --> C
        K --> E
        K --> G
    end
```

### Container Architecture

```mermaid
graph TB
    subgraph "Docker Layers"
        A[Alpine Linux Base] --> B[Node.js 20 Runtime]
        B --> C[Application Code]
        C --> D[Production Dependencies]
        D --> E[Security Hardening]
    end
    
    subgraph "Container Security"
        F[Non-root User] --> G[nodejs:1001]
        H[dumb-init] --> I[Signal Handling]
        J[Health Checks] --> K[/health Endpoint]
    end
    
    subgraph "Volume Mounts"
        L[Data Directory] --> M[/app/data]
        N[Uploads Directory] --> O[/app/uploads]
        P[Logs Directory] --> Q[/app/logs]
    end
```

## 🔐 Security Architecture

### Security Layers

```mermaid
graph TB
    subgraph "Network Security"
        A[HTTPS/TLS] --> B[SSL Termination]
        C[Firewall Rules] --> D[Port Restrictions]
    end
    
    subgraph "Application Security"
        E[Helmet Headers] --> F[Security Headers]
        G[Rate Limiting] --> H[Request Throttling]
        I[Input Validation] --> J[Data Sanitization]
    end
    
    subgraph "Authentication"
        K[JWT Tokens] --> L[Session Management]
        M[Password Hashing] --> N[bcrypt]
        O[API Keys] --> P[Service Authentication]
    end
    
    subgraph "Data Security"
        Q[Data Encryption] --> R[At Rest]
        S[Data Encryption] --> T[In Transit]
        U[Access Control] --> V[Role-based Permissions]
    end
```

## 📈 Scalability Patterns

### Horizontal Scaling Strategy

| Component | Scaling Method | Trigger | Implementation |
|-----------|----------------|---------|----------------|
| **API Servers** | Auto-scaling groups | CPU/Memory usage | Platform-native scaling |
| **Database** | Read replicas | Read-heavy workloads | SQLite → PostgreSQL migration |
| **File Storage** | CDN distribution | Global access | Cloudflare CDN |
| **Caching** | Redis clusters | High-frequency requests | In-memory → Redis migration |

### Performance Optimization

```mermaid
graph LR
    subgraph "Performance Layers"
        A[CDN] --> B[Static Assets]
        C[Load Balancer] --> D[Request Distribution]
        E[Caching] --> F[Response Caching]
        G[Database] --> H[Query Optimization]
    end
    
    subgraph "Monitoring"
        I[Response Time] --> J[<200ms Target]
        K[Throughput] --> L[1000 req/sec]
        M[Error Rate] --> N[<0.1% Target]
    end
```

## 🎯 Design Principles

### 1. **Simplicity First**
- Minimal dependencies
- Clear separation of concerns
- Easy to understand and maintain

### 2. **Platform Agnostic**
- Multiple deployment options
- No vendor lock-in
- Easy migration between platforms

### 3. **Security by Design**
- Defense in depth
- Principle of least privilege
- Regular security audits

### 4. **Observability**
- Comprehensive logging
- Health checks
- Performance monitoring

### 5. **Disaster Recovery**
- Automated backups
- Multi-region deployment
- Quick recovery procedures

## 🔄 Evolution Roadmap

### Phase 1: Current State ✅
- JSON file-based storage
- Single-region deployment
- Basic monitoring

### Phase 2: Enhanced (Q1 2025)
- SQLite database migration
- Multi-region deployment
- Advanced monitoring

### Phase 3: Enterprise (Q2 2025)
- PostgreSQL database
- Microservices architecture
- Advanced security features

### Phase 4: Scale (Q3 2025)
- Kubernetes orchestration
- Service mesh
- Advanced analytics

---

## 📝 Architecture Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|-------------------------|
| **JSON Files for Data** | Simplicity, easy backup | PostgreSQL, MongoDB |
| **Express.js Framework** | Mature, well-documented | Fastify, Koa |
| **Docker Containerization** | Consistency, portability | Direct deployment |
| **Multi-platform Deployment** | Redundancy, cost optimization | Single platform |

## 🔗 Related Documentation

- [Deployment Platforms](./deployment-platforms.md)
- [CI/CD Pipeline](./ci-cd-pipeline.md)
- [Security & Compliance](./security-compliance.md)
- [Performance & Scaling](./performance-scaling.md)

---

**Last Updated**: December 2024  
**Version**: 2.0.0  
**Architect**: DevOps Team 
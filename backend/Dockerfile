# Multi-stage Dockerfile for ProTube Backend (Spring Boot + bundled Frontend)
# Note: Build context must be repository root (e.g. `docker build -f backend/Dockerfile .`)
# because Maven with profile `prod` compiles and bundles `../frontend`.

# Stage 1: Build
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Copy backend and frontend source directories
COPY backend /workspace/backend
COPY frontend /workspace/frontend

WORKDIR /workspace/backend
RUN mvn -Pprod clean package -DskipTests

# Stage 2: Runtime
FROM eclipse-temurin:21-jre
WORKDIR /app

# Copy executable jar from build stage
COPY --from=build /workspace/backend/target/protube-back-*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

FROM eclipse-temurin:21-jdk-jammy AS builder

WORKDIR /workspace

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./

RUN chmod +x mvnw
RUN ./mvnw dependency:go-offline -B

COPY src/ src/

RUN ./mvnw clean package \
    -DskipTests \
    -B


FROM eclipse-temurin:21-jre-jammy AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system academy \
    && useradd \
    --system \
    --gid academy \
    --home-dir /app \
    --shell /usr/sbin/nologin \
    academy

WORKDIR /app

COPY --from=builder \
    /workspace/target/*.jar \
    application.jar

RUN chown academy:academy application.jar

COPY docker-entrypoint.sh /app/docker-entrypoint.sh

RUN chmod 500 /app/docker-entrypoint.sh \
    && chown academy:academy \
    /app/docker-entrypoint.sh

USER academy

EXPOSE 8080

ENV JAVA_OPTS=""

ENTRYPOINT ["/app/docker-entrypoint.sh"]

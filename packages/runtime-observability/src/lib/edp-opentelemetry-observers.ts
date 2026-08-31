import {
    metrics,
    SpanKind,
    trace,
    type Attributes,
    type Meter,
    type Tracer,
} from '@opentelemetry/api';
import type {
    ReaderObservation,
    ReaderObserver,
    RunnerObservation,
    RunnerObserver,
    UseCaseExecutorObservation,
    UseCaseExecutorObserver,
} from '@event-driven-platform/observability';

const INSTRUMENTATION_NAME = '@accounterbro/runtime-observability/edp';

type EdpComponent = 'runner' | 'reader' | 'use-case-executor';

interface EdpTelemetryRecord {
    readonly component: EdpComponent;
    readonly event: string;
    readonly name?: string;
    readonly traceAttributes: Attributes;
    readonly metricAttributes: Attributes;
    readonly durationMs?: number;
    readonly retryDelayMs?: number;
}

export interface EdpOpenTelemetryObservers {
    readonly runner: RunnerObserver;
    readonly reader: ReaderObserver;
    readonly useCaseExecutor: UseCaseExecutorObserver;
}

class EdpOpenTelemetryRecorder {
    private readonly tracer: Tracer;
    private readonly observations;
    private readonly durations;
    private readonly retries;
    private readonly retryDelays;

    public constructor(meter: Meter = metrics.getMeter(INSTRUMENTATION_NAME)) {
        this.tracer = trace.getTracer(INSTRUMENTATION_NAME);
        this.observations = meter.createCounter('edp.lifecycle.observations', {
            description: 'Count of EDP lifecycle observations.',
        });
        this.durations = meter.createHistogram('edp.lifecycle.duration', {
            description: 'Duration reported by EDP lifecycle observations.',
            unit: 'ms',
        });
        this.retries = meter.createCounter('edp.retry.scheduled', {
            description: 'Count of retries scheduled by EDP execution boundaries.',
        });
        this.retryDelays = meter.createHistogram('edp.retry.delay', {
            description: 'Retry delay scheduled by EDP execution boundaries.',
            unit: 'ms',
        });
    }

    public record(record: EdpTelemetryRecord): void {
        const metricAttributes: Attributes = {
            'edp.component': record.component,
            'edp.event': record.event,
            ...(record.name ? { 'edp.name': record.name } : {}),
            ...record.metricAttributes,
        };

        this.observations.add(1, metricAttributes);

        if (record.durationMs !== undefined) {
            this.durations.record(record.durationMs, metricAttributes);
        }

        if (record.retryDelayMs !== undefined) {
            this.retries.add(1, metricAttributes);
            this.retryDelays.record(record.retryDelayMs, metricAttributes);
        }

        const traceAttributes: Attributes = {
            ...metricAttributes,
            ...record.traceAttributes,
            ...(record.durationMs !== undefined
                ? { 'edp.duration.ms': record.durationMs }
                : {}),
            ...(record.retryDelayMs !== undefined
                ? { 'edp.retry.delay.ms': record.retryDelayMs }
                : {}),
        };
        const eventName = `edp.${record.component}.${record.event}`;
        const activeSpan = trace.getActiveSpan();

        if (activeSpan) {
            activeSpan.addEvent(eventName, traceAttributes);
            return;
        }

        const span = this.tracer.startSpan(eventName, {
            kind: SpanKind.INTERNAL,
            attributes: traceAttributes,
        });
        span.end();
    }
}

function boundedObservationAttributes(
    observation: RunnerObservation | ReaderObservation | UseCaseExecutorObservation,
): Attributes {
    switch (observation.type) {
        case 'execution.completed':
        case 'read.completed':
        case 'read.attempt.completed':
        case 'attempt.completed':
        case 'cache.lookup.completed':
        case 'cache.population.completed':
        case 'source.completed':
        case 'distributed-coordination.completed':
        case 'claim.completed':
        case 'completion.completed':
        case 'release.completed':
            return {
                'edp.outcome': observation.outcome,
                ...('retryable' in observation
                    ? { 'edp.retryable': observation.retryable }
                    : {}),
                ...('scope' in observation ? { 'edp.cache.scope': observation.scope } : {}),
                ...('level' in observation ? { 'edp.cache.level': observation.level } : {}),
            };
        case 'claim.rejected':
            return { 'edp.reason': observation.reason };
        default:
            return {};
    }
}

function attemptTraceAttributes(
    observation: RunnerObservation | ReaderObservation,
): Attributes {
    return 'attempt' in observation ? { 'edp.attempt': observation.attempt } : {};
}

export function toRunnerTelemetryRecord(observation: RunnerObservation): EdpTelemetryRecord {
    return {
        component: 'runner',
        event: observation.type,
        name: observation.context.operation,
        metricAttributes: boundedObservationAttributes(observation),
        traceAttributes: {
            'edp.operation': observation.context.operation,
            'edp.intent.id': observation.context.intentId,
            'edp.correlation.id': observation.context.correlationId,
            ...attemptTraceAttributes(observation),
        },
        ...('durationMs' in observation ? { durationMs: observation.durationMs } : {}),
        ...(observation.type === 'retry.scheduled'
            ? { retryDelayMs: observation.delayMs }
            : {}),
    };
}

export function toReaderTelemetryRecord(observation: ReaderObservation): EdpTelemetryRecord {
    return {
        component: 'reader',
        event: observation.type,
        name: observation.context.read,
        metricAttributes: boundedObservationAttributes(observation),
        traceAttributes: {
            'edp.read': observation.context.read,
            ...attemptTraceAttributes(observation),
        },
        ...('durationMs' in observation ? { durationMs: observation.durationMs } : {}),
        ...(observation.type === 'read.retry.scheduled'
            ? { retryDelayMs: observation.delayMs }
            : {}),
    };
}

export function toUseCaseExecutorTelemetryRecord(
    observation: UseCaseExecutorObservation,
): EdpTelemetryRecord {
    return {
        component: 'use-case-executor',
        event: observation.type,
        metricAttributes: boundedObservationAttributes(observation),
        traceAttributes: {
            'edp.intent.id': observation.context.intentId,
            'edp.correlation.id': observation.context.correlationId,
        },
        ...('durationMs' in observation ? { durationMs: observation.durationMs } : {}),
    };
}

export function createEdpOpenTelemetryObservers(): EdpOpenTelemetryObservers {
    const recorder = new EdpOpenTelemetryRecorder();

    return {
        runner: {
            observe: (observation) => recorder.record(toRunnerTelemetryRecord(observation)),
        },
        reader: {
            observe: (observation) => recorder.record(toReaderTelemetryRecord(observation)),
        },
        useCaseExecutor: {
            observe: (observation) =>
                recorder.record(toUseCaseExecutorTelemetryRecord(observation)),
        },
    };
}

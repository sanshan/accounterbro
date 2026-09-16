import { type DynamicModule, type FactoryProvider, Module, type Provider } from '@nestjs/common';
import { Kafka, type ConsumerConfig, type KafkaConfig, type ProducerConfig } from 'kafkajs';

import { EventIngress } from '../../event-ingress.js';
import { RuntimeMessagingBootstrap } from '../../nest/runtime-messaging-bootstrap.js';
import { RuntimeMessagingModule } from '../../nest/runtime-messaging.module.js';
import { KafkaJsEventConsumer } from '../kafkajs-event-consumer.js';
import {
    SchemaRegistryAvroEventCodec,
    type SchemaRegistryConnectionOptions,
} from '../schema-registry-avro-event-codec.js';
import { RedpandaEventConsumerLifecycle } from './redpanda-event-consumer-lifecycle.js';

const REDPANDA_EVENT_CONSUMER_OPTIONS = Symbol('REDPANDA_EVENT_CONSUMER_OPTIONS');

export interface RedpandaEventConsumerModuleOptions {
    readonly kafka: KafkaConfig;
    readonly schemaRegistry: SchemaRegistryConnectionOptions;
    readonly consumer: ConsumerConfig;
    readonly producer?: ProducerConfig;
    readonly topics: readonly string[];
}

@Module({})
export class RedpandaEventConsumerModule {
    public static forRoot(options: RedpandaEventConsumerModuleOptions): DynamicModule {
        const optionsProvider: Provider = {
            provide: REDPANDA_EVENT_CONSUMER_OPTIONS,
            useValue: options,
        };
        const lifecycleProvider: FactoryProvider<RedpandaEventConsumerLifecycle> = {
            provide: RedpandaEventConsumerLifecycle,
            inject: [REDPANDA_EVENT_CONSUMER_OPTIONS, RuntimeMessagingBootstrap, EventIngress],
            useFactory: (
                consumerOptions: RedpandaEventConsumerModuleOptions,
                messagingBootstrap: RuntimeMessagingBootstrap,
                ingress: EventIngress,
            ) => {
                const kafka = new Kafka(consumerOptions.kafka);
                const consumer = kafka.consumer(consumerOptions.consumer);
                const producer = kafka.producer(consumerOptions.producer);
                const codec = new SchemaRegistryAvroEventCodec(consumerOptions.schemaRegistry);
                const delivery = new KafkaJsEventConsumer({
                    consumer,
                    producer,
                    codec,
                    ingress,
                    consumerGroup: consumerOptions.consumer.groupId,
                    topics: consumerOptions.topics,
                });

                return new RedpandaEventConsumerLifecycle({
                    messagingBootstrap,
                    consumer,
                    producer,
                    delivery,
                });
            },
        };

        return {
            module: RedpandaEventConsumerModule,
            imports: [RuntimeMessagingModule],
            providers: [optionsProvider, lifecycleProvider],
        };
    }
}

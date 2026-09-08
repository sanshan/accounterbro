const DocumentsTypeOrmModule = {};
const documents = {};
const RuntimeExecutionsModule = {
    register: (_manifests: unknown[]) => ({}),
};
const moduleMetadata = {
imports: [
    DocumentsTypeOrmModule,
    RuntimeExecutionsModule.register([documents]),
]
};
void moduleMetadata;

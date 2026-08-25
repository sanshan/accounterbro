import { Container, Stack, Text, Title } from '@mantine/core';

import { DocumentUpload } from '../features/documents/document-upload';

export default function App() {
    return (
        <Container size="sm" py="xl">
            <Stack gap="md">
                <div>
                    <Title order={1}>Documents</Title>
                    <Text c="dimmed" mt="xs">
                        Upload a file to register it.
                    </Text>
                </div>

                <DocumentUpload />
            </Stack>
        </Container>
    );
}

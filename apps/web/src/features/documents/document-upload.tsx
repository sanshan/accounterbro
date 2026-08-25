import { Alert, Button, FileInput, Paper, Stack, Text } from '@mantine/core';
import { type FormEvent, useState } from 'react';

interface RegisterDocumentResponse {
    readonly id: string;
    readonly status: 'PENDING' | 'REGISTERED' | 'FAILED';
    readonly duplicate: boolean;
}

type SubmissionState =
    | { readonly status: 'idle' }
    | { readonly status: 'submitting' }
    | { readonly status: 'success'; readonly result: RegisterDocumentResponse }
    | { readonly status: 'error'; readonly message: string };

async function registerDocument(file: File): Promise<RegisterDocumentResponse> {
    const form = new FormData();
    form.append('file', file);

    const response = await fetch('/documents', {
        method: 'POST',
        body: form,
    });

    if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
    }

    return (await response.json()) as RegisterDocumentResponse;
}

export function DocumentUpload() {
    const [file, setFile] = useState<File | null>(null);
    const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });

    const handleFileChange = (nextFile: File | null) => {
        setFile(nextFile);
        setSubmission({ status: 'idle' });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!file || submission.status === 'submitting') {
            return;
        }

        setSubmission({ status: 'submitting' });

        try {
            const result = await registerDocument(file);
            setSubmission({ status: 'success', result });
        } catch (error) {
            setSubmission({
                status: 'error',
                message: error instanceof Error ? error.message : 'Upload failed',
            });
        }
    };

    return (
        <Paper withBorder p="lg" radius="md">
            <form onSubmit={handleSubmit}>
                <Stack gap="md">
                    <FileInput
                        label="File"
                        placeholder="Choose a file"
                        value={file}
                        onChange={handleFileChange}
                        clearable
                    />

                    <Button
                        type="submit"
                        disabled={!file}
                        loading={submission.status === 'submitting'}
                    >
                        Upload
                    </Button>

                    {submission.status === 'success' && (
                        <Alert title="Document registered" color="green">
                            <Stack gap={4}>
                                <Text size="sm">ID: {submission.result.id}</Text>
                                <Text size="sm">Status: {submission.result.status}</Text>
                                <Text size="sm">
                                    Duplicate: {submission.result.duplicate ? 'yes' : 'no'}
                                </Text>
                            </Stack>
                        </Alert>
                    )}

                    {submission.status === 'error' && (
                        <Alert title="Upload failed" color="red">
                            {submission.message}
                        </Alert>
                    )}
                </Stack>
            </form>
        </Paper>
    );
}

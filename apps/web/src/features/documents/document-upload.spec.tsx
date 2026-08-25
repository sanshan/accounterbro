import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocumentUpload } from './document-upload';

function renderUpload() {
    return render(
        <MantineProvider>
            <DocumentUpload />
        </MantineProvider>,
    );
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('DocumentUpload', () => {
    it('submits the selected file and renders the registration result', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({
                id: 'document-123',
                status: 'REGISTERED',
                duplicate: false,
            }),
        });
        vi.stubGlobal('fetch', fetchMock);
        renderUpload();

        const uploadButton = screen.getByRole('button', { name: 'Upload' });
        expect(uploadButton).toBeDisabled();

        const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });
        await user.upload(screen.getByLabelText('File'), file);
        expect(uploadButton).toBeEnabled();

        await user.click(uploadButton);

        expect(fetchMock).toHaveBeenCalledOnce();
        const firstCall = fetchMock.mock.calls[0];
        if (!firstCall) {
            throw new Error('Expected fetch to be called');
        }
        const [url, options] = firstCall;
        expect(url).toBe('/documents');
        expect(options).toMatchObject({ method: 'POST' });
        expect(options.body).toBeInstanceOf(FormData);
        expect((options.body as FormData).get('file')).toBe(file);

        expect(await screen.findByText('ID: document-123')).toBeInTheDocument();
        expect(screen.getByText('Status: REGISTERED')).toBeInTheDocument();
        expect(screen.getByText('Duplicate: no')).toBeInTheDocument();
    });

    it('shows a request failure and allows retry', async () => {
        const user = userEvent.setup();
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        });
        vi.stubGlobal('fetch', fetchMock);
        renderUpload();

        const file = new File(['invoice'], 'invoice.pdf', { type: 'application/pdf' });
        await user.upload(screen.getByLabelText('File'), file);

        const uploadButton = screen.getByRole('button', { name: 'Upload' });
        await user.click(uploadButton);

        expect(await screen.findByText('Upload failed (500)')).toBeInTheDocument();
        expect(uploadButton).toBeEnabled();
    });
});

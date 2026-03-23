export default function TermsPage() {
    return (
        <main className="min-h-screen px-6 py-14">
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-6 text-4xl font-bold text-black">
                    Terms of Service
                </h1>

                <p className="mb-6 text-sm text-gray-500">
                    Last updated: March 22, 2026
                </p>

                <div className="space-y-6 text-sm text-gray-700">
                    <p>
                        PlaywrightGen is an AI-powered tool that helps developers generate
                        Playwright test scripts from prompts, HTML, and web pages.
                    </p>

                    <p>
                        By using this service, you agree to use it responsibly and in
                        compliance with applicable laws.
                    </p>

                    <p>
                        Paid features are processed securely via Stripe. All payments are
                        non-refundable unless required by law.
                    </p>

                    <p>
                        The service is provided "as is" without guarantees of uptime,
                        accuracy, or reliability. You are responsible for validating any
                        generated output.
                    </p>

                    <p>
                        We may update these terms at any time. Continued use means you accept
                        the updated terms.
                    </p>
                </div>
            </div>
        </main>
    );
}
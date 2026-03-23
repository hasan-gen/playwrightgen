export default function PrivacyPage() {
    return (
        <main className="min-h-screen px-6 py-14">
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-6 text-4xl font-bold text-black">
                    Privacy Policy
                </h1>

                <p className="mb-6 text-sm text-gray-500">
                    Last updated: March 22, 2026
                </p>

                <div className="space-y-6 text-sm text-gray-700">
                    <p>
                        We collect minimal data necessary to operate PlaywrightGen,
                        including email addresses used for Pro access and payments handled
                        through Stripe.
                    </p>

                    <p>
                        We do not store full payment details. Payments are securely processed
                        by Stripe.
                    </p>

                    <p>
                        We do not sell your personal data. Information may be shared with
                        service providers (e.g., Stripe, hosting providers) only as needed
                        to run the service.
                    </p>

                    <p>
                        The app may use browser localStorage to store history and temporary
                        session data for better user experience.
                    </p>

                    <p>
                        We take reasonable steps to protect your data, but no system is 100%
                        secure.
                    </p>

                    <p>
                        Continued use of the service means you agree to this policy.
                    </p>
                </div>
            </div>
        </main>
    );
}
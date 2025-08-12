import { Link } from 'wouter';

export default function Guidelines() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Community Guidelines</h1>
          <Link href="/forum" className="text-maroon hover:underline">Back to Forum</Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-gray-700 mb-6">We want ShipIts Forum to be a safe, welcoming place for everyone. By using the platform, you agree to the following rules:</p>

        <ul className="list-disc pl-6 space-y-3 text-gray-800">
          <li><strong>Be respectful.</strong> No harassment, hate speech, or personal attacks.</li>
          <li><strong>No spam or self-promotion.</strong> Irrelevant links, advertisements, or repetitive posts are not allowed.</li>
          <li><strong>Stay on topic.</strong> Keep discussions relevant to projects and constructive collaboration.</li>
          <li><strong>Protect privacy.</strong> Don’t share others’ personal information without consent.</li>
          <li><strong>Report issues.</strong> Use the Report button on profiles, projects, or comments to flag abusive or inappropriate content.</li>
          <li><strong>Follow the law.</strong> No illegal content, copyright infringement, or explicit material.</li>
        </ul>

        <p className="text-gray-600 mt-8">Violations may result in content removal, account restrictions, or bans.</p>
      </main>
    </div>
  );
}


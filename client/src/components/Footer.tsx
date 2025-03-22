export default function Footer() {
  return (
    <footer className="mt-12 py-4 border-t border-gray-200">
      <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
        <div className="mb-4 md:mb-0">
          <p>© {new Date().getFullYear()} AI Prompt Interface. All rights reserved.</p>
        </div>
        <div className="flex space-x-4">
          <a href="#" className="hover:text-gray-700">Terms</a>
          <a href="#" className="hover:text-gray-700">Privacy</a>
          <a href="#" className="hover:text-gray-700">Documentation</a>
        </div>
      </div>
    </footer>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-cream px-6 py-24 sm:py-32 lg:px-8 flex flex-col justify-center">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-base font-bold text-accent-600">404</p>
        <h1 className="mt-4 text-4xl font-display font-bold tracking-tight text-primary-900 sm:text-6xl">
          Page not found
        </h1>
        <p className="mt-6 text-base leading-7 text-primary-600">
          Sorry, we couldn't find the page you're looking for.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="rounded-xl bg-primary-900 px-3.5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-primary-800 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Go back home'}
          </Link>
          <Link
            to="/"
            className="text-sm font-bold text-primary-900 hover:text-accent-600 transition-colors"
          >
            Contact support <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
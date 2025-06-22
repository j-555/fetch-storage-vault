import { Disclosure, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import React from 'react';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, icon: Icon, children }: CollapsibleSectionProps) {
  return (
    <Disclosure>
      {({ open }) => (
        <>
          <Disclosure.Button className="flex w-full items-center justify-between py-3 px-4 text-left text-sm font-medium text-gray-200 hover:bg-white/5 rounded-lg focus:outline-none focus-visible:ring focus-visible:ring-indigo-500/75">
            <div className="flex items-center space-x-3">
              <Icon className="h-5 w-5 text-gray-400" />
              <span>{title}</span>
            </div>
            <ChevronDownIcon
              className={`${
                open ? 'rotate-180 transform' : ''
              } h-5 w-5 text-gray-500 transition-transform`}
            />
          </Disclosure.Button>
          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Disclosure.Panel className="px-4 pt-2 pb-2 text-sm text-gray-500">
              <div className="space-y-2 border-l border-gray-700 ml-2 pl-5">
                {children}
              </div>
            </Disclosure.Panel>
          </Transition>
        </>
      )}
    </Disclosure>
  );
}
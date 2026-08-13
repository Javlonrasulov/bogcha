import type { Metadata } from 'next';
import { ChildForm } from './child-form';

export const metadata: Metadata = { title: "Yangi bola qo'shish" };

export default function NewChildPage() {
  return <ChildForm />;
}

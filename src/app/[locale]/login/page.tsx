import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LoginPage() {
  const t = useTranslations('Login');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <LanguageSwitcher />
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-blue-600">
              AssemblyMES
            </CardTitle>
            <CardDescription>
              {t('title')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input 
                id="username" 
                type="text" 
                placeholder={t('username_placeholder')} 
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Input 
                id="password" 
                type="password" 
                placeholder={t('password_placeholder')} 
                className="h-12 text-base"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full h-12 text-base font-semibold">{t('submit_button')}</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
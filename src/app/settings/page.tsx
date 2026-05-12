"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { toast } from "sonner";
import { Building2, Globe, Moon, Sun, Languages, Save } from "lucide-react";

export default function SettingsPageWrapper() {
  return (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  );
}

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const qc = useQueryClient();

  // Profile Form State
  const [profile, setProfile] = useState({
    agency_name: "",
    logo_url: "",
    timezone: "UTC",
  });

  const { data: remoteProfile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  useEffect(() => {
    if (remoteProfile) {
      setProfile({
        agency_name: remoteProfile.agency_name || "",
        logo_url: remoteProfile.logo_url || "",
        timezone: remoteProfile.timezone || "UTC",
      });
    }
  }, [remoteProfile]);

  const updateProfile = useMutation({
    mutationFn: async (newData: typeof profile) => {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user?.id,
          ...newData,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(t("common.save", "Settings saved successfully"));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSave = () => {
    updateProfile.mutate(profile);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    toast.success("Language updated");
  };

  return (
    <AppShell title={t("pages.settings.title", "Settings")}>
      <div className="max-w-4xl space-y-6">
        
        {/* Agency Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="text-lg">Agency Profile</CardTitle>
                <CardDescription>Manage your public agency branding and identity</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="agency_name">Agency Name</Label>
                <Input 
                  id="agency_name" 
                  value={profile.agency_name} 
                  onChange={(e) => setProfile({...profile, agency_name: e.target.value})}
                  placeholder="e.g. Pinnacle Digital"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input 
                  id="logo_url" 
                  value={profile.logo_url} 
                  onChange={(e) => setProfile({...profile, logo_url: e.target.value})}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={updateProfile.isPending}>
                <Save className="h-4 w-4 mr-2" /> {t("common.save", "Save Changes")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Regional & Localization */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="text-lg">Regional & Language</CardTitle>
                <CardDescription>Configure your timezone and interface language</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Languages className="h-4 w-4 text-muted-foreground" />
                  <Label>Interface Language</Label>
                </div>
                <Select value={i18n.language} onValueChange={changeLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        <span className="mr-2">{lang.flag}</span> {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select 
                  value={profile.timezone} 
                  onValueChange={(v) => setProfile({...profile, timezone: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC (Universal Time)</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Asia/Dhaka">Bangladesh (BST)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-accent" /> : <Sun className="h-5 w-5 text-accent" />}
              <div>
                <CardTitle className="text-lg">Appearance</CardTitle>
                <CardDescription>Customize the look and feel of your workspace</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="font-medium">Interface Theme</div>
                <div className="text-sm text-muted-foreground">Switch between light and dark themes</div>
              </div>
              <div className="flex p-1 bg-muted rounded-lg">
                <Button 
                  variant={theme === 'light' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="px-4"
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-4 w-4 mr-2" /> Light
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  className="px-4"
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-4 w-4 mr-2" /> Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppShell>
  );
}

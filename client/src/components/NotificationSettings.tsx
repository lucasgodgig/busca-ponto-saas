import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Check } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function NotificationSettings() {
  const { isSupported, permission, requestPermission, sendNotification } = useNotifications();
  const [notifyOnUpdate, setNotifyOnUpdate] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);

  // Carregar preferências do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("notificationPreferences");
    if (saved) {
      const prefs = JSON.parse(saved);
      setNotifyOnUpdate(prefs.onUpdate ?? true);
      setNotifyOnComplete(prefs.onComplete ?? true);
    }
  }, []);

  // Salvar preferências
  const savePreferences = (onUpdate: boolean, onComplete: boolean) => {
    localStorage.setItem("notificationPreferences", JSON.stringify({
      onUpdate,
      onComplete,
    }));
  };

  const handleRequestPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success("Notificações ativadas!");
      sendNotification("Notificações ativadas", {
        body: "Você receberá atualizações sobre seus estudos",
      });
    } else {
      toast.error("Permissão negada");
    }
  };

  const handleToggleUpdate = (checked: boolean) => {
    setNotifyOnUpdate(checked);
    savePreferences(checked, notifyOnComplete);
    toast.success(checked ? "Notificações de atualização ativadas" : "Notificações de atualização desativadas");
  };

  const handleToggleComplete = (checked: boolean) => {
    setNotifyOnComplete(checked);
    savePreferences(notifyOnUpdate, checked);
    toast.success(checked ? "Notificações de conclusão ativadas" : "Notificações de conclusão desativadas");
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notificações não suportadas
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações
        </CardTitle>
        <CardDescription>
          Receba atualizações sobre seus estudos de mercado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status de permissão */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {permission === "granted" ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Bell className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {permission === "granted" && "Notificações ativadas"}
                {permission === "denied" && "Notificações bloqueadas"}
                {permission === "default" && "Notificações desativadas"}
              </p>
              <p className="text-sm text-muted-foreground">
                {permission === "granted" && "Você receberá notificações"}
                {permission === "denied" && "Ative nas configurações do navegador"}
                {permission === "default" && "Clique para ativar"}
              </p>
            </div>
          </div>
          {permission !== "granted" && permission !== "denied" && (
            <Button onClick={handleRequestPermission}>
              Ativar
            </Button>
          )}
        </div>

        {/* Preferências de notificações */}
        {permission === "granted" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notify-update" className="flex flex-col gap-1">
                <span>Atualizações de estudos</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Notificar quando houver mudanças no status
                </span>
              </Label>
              <Switch
                id="notify-update"
                checked={notifyOnUpdate}
                onCheckedChange={handleToggleUpdate}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="notify-complete" className="flex flex-col gap-1">
                <span>Estudos concluídos</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Notificar quando um estudo for finalizado
                </span>
              </Label>
              <Switch
                id="notify-complete"
                checked={notifyOnComplete}
                onCheckedChange={handleToggleComplete}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Loader2, ArrowLeft, MapPin, Search } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function NewStudy() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    segment: "",
    address: "",
    lat: 0,
    lng: 0,
    radiusM: 1500,
    objectives: "",
  });

  const [searchAddress, setSearchAddress] = useState("");
  const [searching, setSearching] = useState(false);

  const createStudyMutation = trpc.studies.create.useMutation({
    onSuccess: () => {
      toast.success("Estudo criado com sucesso!");
      setLocation("/studies");
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar estudo");
    },
  });

  // Selecionar tenant automaticamente
  if (!authLoading && user && user.memberships && user.memberships.length > 0 && !selectedTenant) {
    setSelectedTenant(user.memberships[0].tenant?.id || null);
  }

  // Buscar endereço
  const handleSearchAddress = useCallback(async () => {
    if (!searchAddress.trim()) {
      toast.error("Digite um endereço para buscar");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`
      );
      const data = await response.json();

      if (data.length === 0) {
        toast.error("Endereço não encontrado");
        return;
      }

      const { lat, lon, display_name } = data[0];
      setFormData({
        ...formData,
        address: display_name,
        lat: parseFloat(lat),
        lng: parseFloat(lon),
      });

      toast.success("Endereço encontrado!");
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
      toast.error("Erro ao buscar endereço");
    } finally {
      setSearching(false);
    }
  }, [searchAddress, formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTenant) {
      toast.error("Selecione um tenant");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Digite o título do estudo");
      return;
    }

    if (!formData.segment.trim()) {
      toast.error("Digite o segmento");
      return;
    }

    if (!formData.address.trim() || formData.lat === 0 || formData.lng === 0) {
      toast.error("Busque um endereço válido");
      return;
    }

    await createStudyMutation.mutateAsync({
      tenantId: selectedTenant,
      title: formData.title,
      segment: formData.segment,
      address: formData.address,
      lat: formData.lat,
      lng: formData.lng,
      radiusM: formData.radiusM,
      objectives: formData.objectives || undefined,
    });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/studies")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Novo Estudo de Mercado</h1>
              <p className="text-sm text-muted-foreground">
                Preencha os dados para solicitar um estudo
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Formulário */}
      <div className="container py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Estudo</CardTitle>
            <CardDescription>
              Forneça os detalhes para que nossa equipe possa realizar a análise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Título */}
              <div className="space-y-2">
                <Label htmlFor="title">Título do Estudo *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Viabilidade de Academia na Zona Sul"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  disabled={createStudyMutation.isPending}
                />
              </div>

              {/* Segmento */}
              <div className="space-y-2">
                <Label htmlFor="segment">Segmento *</Label>
                <Input
                  id="segment"
                  placeholder="Ex: Academia, Lavanderia, Restaurante"
                  value={formData.segment}
                  onChange={(e) =>
                    setFormData({ ...formData, segment: e.target.value })
                  }
                  disabled={createStudyMutation.isPending}
                />
              </div>

              {/* Busca de endereço */}
              <div className="space-y-2">
                <Label htmlFor="search">Localização *</Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    placeholder="Digite o endereço ou CEP"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchAddress())}
                    disabled={searching || createStudyMutation.isPending}
                  />
                  <Button
                    type="button"
                    onClick={handleSearchAddress}
                    disabled={searching || createStudyMutation.isPending}
                    size="icon"
                  >
                    {searching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {formData.address && (
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm">
                    <MapPin className="w-4 h-4 mt-0.5 text-primary" />
                    <div>
                      <p className="font-medium">{formData.address}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Raio de análise */}
              <div className="space-y-2">
                <Label htmlFor="radius">
                  Raio de Análise: {formData.radiusM}m ({(formData.radiusM / 1000).toFixed(1)}km)
                </Label>
                <Slider
                  id="radius"
                  value={[formData.radiusM]}
                  onValueChange={(value) =>
                    setFormData({ ...formData, radiusM: value[0] })
                  }
                  min={500}
                  max={5000}
                  step={100}
                  disabled={createStudyMutation.isPending}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>500m</span>
                  <span>5km</span>
                </div>
              </div>

              {/* Objetivos */}
              <div className="space-y-2">
                <Label htmlFor="objectives">Objetivos e Observações</Label>
                <Textarea
                  id="objectives"
                  placeholder="Descreva os objetivos do estudo e qualquer informação relevante..."
                  value={formData.objectives}
                  onChange={(e) =>
                    setFormData({ ...formData, objectives: e.target.value })
                  }
                  disabled={createStudyMutation.isPending}
                  rows={4}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={createStudyMutation.isPending}
                  className="flex-1"
                >
                  {createStudyMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Estudo"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/studies")}
                  disabled={createStudyMutation.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


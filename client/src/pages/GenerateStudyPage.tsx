import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import MapShell from "@/components/MapShell";

const SEGMENTS = [
  "Academia",
  "Farmácia",
  "Petshop",
  "Restaurante",
  "Supermercado",
  "Loja",
  "Clínica",
];

export default function GenerateStudyPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const tenantId = user?.memberships?.[0]?.tenant?.id;
  const [title, setTitle] = useState("");
  const [segment, setSegment] = useState("");
  const [lat, setLat] = useState(-23.55);
  const [lng, setLng] = useState(-46.63);
  const [radiusM, setRadiusM] = useState(1500);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createMutation = trpc.generatedStudies.create.useMutation();

  const handleCreate = async () => {
    if (!title || !segment) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsLoading(true);
    try {
      const result = await createMutation.mutateAsync({
        title,
        segment,
        lat,
        lng,
        radiusM,
        notes: notes || undefined,
      });

      toast.success("Estudo criado com sucesso!");
      setLocation(`/generated-studies/${result.studyId}`);
    } catch (error) {
      toast.error("Erro ao criar estudo");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen gap-4 p-4">
      {/* Mapa à esquerda */}
      <div className="flex-1">
        {tenantId && (
          <MapShell
            tenantId={tenantId}
          />
        )}
      </div>

      {/* Formulário à direita */}
      <div className="w-96 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle>Gerar Estudo Automático</CardTitle>
            <CardDescription>
              Crie um novo estudo de mercado com dados automáticos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Título */}
            <div>
              <Label htmlFor="title">Título do Estudo *</Label>
              <Input
                id="title"
                placeholder="Ex: Análise Av. Paulista"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Segmento */}
            <div>
              <Label htmlFor="segment">Segmento de Negócio *</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger id="segment">
                  <SelectValue placeholder="Selecione um segmento" />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((seg) => (
                    <SelectItem key={seg} value={seg}>
                      {seg}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Localização */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="lat">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="lng">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Raio */}
            <div>
              <Label>Raio de Análise: {(radiusM / 1000).toFixed(1)} km</Label>
              <Slider
                min={500}
                max={5000}
                step={100}
                value={[radiusM]}
                onValueChange={(val) => setRadiusM(val[0])}
              />
            </div>

            {/* Notas */}
            <div>
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre este estudo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setLocation("/generated-studies")}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isLoading || !title || !segment}
              >
                {isLoading ? "Criando..." : "Criar Estudo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


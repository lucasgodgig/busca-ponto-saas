import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MapPin, Building2, Users, DollarSign, FileText } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function CommercialPointDetails() {
  const [, navigate] = useLocation();
  const params = useParams();
  const { user } = useAuth();
  const requestId = params.id ? parseInt(params.id) : 0;

  const { data: request, isLoading, error } = trpc.commercialPoints.getRequest.useQuery(
    { requestId },
    { enabled: !!requestId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/pontos-comerciais")}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Card className="p-8 text-center">
            <p className="text-gray-600">Solicitação não encontrada</p>
          </Card>
        </div>
      </div>
    );
  }

  const statusColors = {
    aberto: "bg-yellow-100 text-yellow-800",
    em_analise: "bg-blue-100 text-blue-800",
    concluido: "bg-green-100 text-green-800",
    cancelado: "bg-red-100 text-red-800",
  };

  const statusLabel = {
    aberto: "Aberto",
    em_analise: "Em Análise",
    concluido: "Concluído",
    cancelado: "Cancelado",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/pontos-comerciais")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status as keyof typeof statusColors] || statusColors.aberto}`}>
            {statusLabel[request.status as keyof typeof statusLabel] || request.status}
          </span>
        </div>

        {/* Main Card */}
        <Card className="p-8 mb-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{request.segment}</h1>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-5 h-5" />
              <span>{request.city}</span>
            </div>
          </div>

          {/* Grid de informações */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Bairros */}
            {request.neighborhoods && request.neighborhoods.length > 0 && (
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-sm text-gray-600 mb-1">Bairros de Interesse</p>
                <p className="text-lg font-semibold text-gray-900">
                  {Array.isArray(request.neighborhoods)
                    ? request.neighborhoods.join(", ")
                    : request.neighborhoods}
                </p>
              </div>
            )}

            {/* Classe Social */}
            {request.socialClass && (
              <div className="border-l-4 border-green-500 pl-4">
                <p className="text-sm text-gray-600 mb-1">Classe Social Atendida</p>
                <p className="text-lg font-semibold text-gray-900">{request.socialClass}</p>
              </div>
            )}

            {/* Tamanho do Imóvel */}
            {request.propertySize && (
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="text-sm text-gray-600 mb-1">Tamanho do Imóvel</p>
                <p className="text-lg font-semibold text-gray-900">{request.propertySize} m²</p>
              </div>
            )}

            {/* Valor Máximo */}
            {request.maxRent && (
              <div className="border-l-4 border-orange-500 pl-4">
                <p className="text-sm text-gray-600 mb-1">Valor Máximo de Aluguel</p>
                <p className="text-lg font-semibold text-gray-900">R$ {request.maxRent.toLocaleString("pt-BR")}</p>
              </div>
            )}
          </div>

          {/* Requisitos Adicionais */}
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Requisitos Adicionais
            </h2>
            <p className="text-gray-700 leading-relaxed">{request.requirements}</p>
          </div>

          {/* Informações de Data */}
          <div className="border-t pt-6">
            <p className="text-sm text-gray-600">
              Solicitação criada em{" "}
              <span className="font-semibold">
                {new Date(request.createdAt).toLocaleDateString("pt-BR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/pontos-comerciais")}
            className="flex-1"
          >
            Voltar para Lista
          </Button>
          {request.status === "aberto" && (
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
              Editar Solicitação
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

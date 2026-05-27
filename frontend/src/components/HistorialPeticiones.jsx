import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useContextoAplicacion } from '../context/ContextoAplicacion';

const HistorialPeticiones = ({ onRefrescar }) => {
  const { historialPeticiones, usuario } = useContextoAplicacion();
  const [refrescando, setRefrescando] = useState(false);

  const manejarRefrescar = async () => {
    setRefrescando(true);
    if (onRefrescar) {
      await onRefrescar();
    }
    setRefrescando(false);
  };

  // Agrupar peticiones por remitente
  const peticionesAgrupadas = useMemo(() => {
    const agrupadas = {};
    historialPeticiones.forEach((peticion) => {
      if (!agrupadas[peticion.remitente]) {
        agrupadas[peticion.remitente] = {
          remitente: peticion.remitente,
          conteo: 0,
          ultimaPeticion: peticion,
        };
      }
      agrupadas[peticion.remitente].conteo += 1;
      if (peticion.timestamp > agrupadas[peticion.remitente].ultimaPeticion.timestamp) {
        agrupadas[peticion.remitente].ultimaPeticion = peticion;
      }
    });
    return Object.values(agrupadas).sort((a, b) => b.ultimaPeticion.timestamp - a.ultimaPeticion.timestamp);
  }, [historialPeticiones]);

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>Historial del Grupo</Text>
        <Text style={estilos.contador}>
          {peticionesAgrupadas.length} miembro{peticionesAgrupadas.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        style={estilos.lista}
        showsVerticalScrollIndicator={false}
      >
        {peticionesAgrupadas.length > 0 ? (
          peticionesAgrupadas.map((grupo) => {
            const esPropio = grupo.remitente === usuario;

            return (
              <View
                key={grupo.remitente}
                style={[
                  estilos.item,
                  esPropio && estilos.itemPropio
                ]}
              >
                <View style={estilos.contenedorIcono}>
                  <Ionicons
                    name={esPropio ? 'checkmark-circle' : 'person-circle-outline'}
                    size={24}
                    color={esPropio ? '#34C759' : '#007AFF'}
                  />
                </View>

                <View style={estilos.contenedorContenido}>
                  <Text style={[
                    estilos.remitente,
                    esPropio && estilos.remitentePropio
                  ]}>
                    {grupo.remitente}
                  </Text>
                  <Text style={estilos.conteo}>
                    {grupo.conteo} petición{grupo.conteo !== 1 ? 'es' : ''}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={estilos.contenedorVacio}>
            <Ionicons name="document-text-outline" size={48} color="#C7C7CC" />
            <Text style={estilos.textoVacio}>No hay señales enviadas aún</Text>
            <Text style={estilos.textoSecundario}>
              Sé el primero en enviar una señal
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 300,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  contador: {
    fontSize: 14,
    color: '#8E8E93',
  },
  lista: {
    maxHeight: 220,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  itemPropio: {
    backgroundColor: '#34C759' + '10',
    borderWidth: 1,
    borderColor: '#34C759' + '30',
  },
  contenedorIcono: {
    minWidth: 40,
    alignItems: 'center',
  },
  contenedorContenido: {
    flex: 1,
  },
  remitente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  remitentePropio: {
    color: '#34C759',
  },
  conteo: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  contenedorVacio: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  textoVacio: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
    fontWeight: '600',
  },
  textoSecundario: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 4,
  },
});

export default HistorialPeticiones;
